import os
import sys
import json
import base64
from pathlib import Path
from datetime import datetime, timezone
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, OnComplete
from algosdk.logic import get_application_address
from dotenv import load_dotenv
import importlib
import sys
from pyteal import compileTeal, Mode

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent

# Ensure import paths for contracts and utils
sys.path.append(str(REPO_ROOT / "contracts"))
sys.path.append(str(REPO_ROOT / "utils"))

load_dotenv()
ALGOD_ADDRESS = os.getenv('ALGOD_ADDRESS', 'https://testnet-api.algonode.cloud')
ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')

CONTRACT_SCHEMAS = {
    "organization_registry": (transaction.StateSchema(10, 5), transaction.StateSchema(0, 0)),
    "user_identity": (transaction.StateSchema(8, 3), transaction.StateSchema(0, 0)),
    "trust_score": (transaction.StateSchema(6, 2), transaction.StateSchema(0, 0)),
    "certificate_management": (transaction.StateSchema(8, 4), transaction.StateSchema(0, 0)),
    "badge_system": (transaction.StateSchema(6, 3), transaction.StateSchema(0, 0)),
    "smart_wallet": (transaction.StateSchema(5, 2), transaction.StateSchema(0, 0)),
    "governance": (transaction.StateSchema(10, 3), transaction.StateSchema(0, 0)),
    "dispute_resolution": (transaction.StateSchema(8, 4), transaction.StateSchema(0, 0)),
    "paymaster": (transaction.StateSchema(3, 1), transaction.StateSchema(0, 0)),
}

# Map names to (module, approval_fn, clear_fn)
CONTRACT_BUILDERS = {
    "organization_registry": ("organization_registry", "organization_registry_contract", "organization_registry_clear_program"),
    "user_identity": ("user_identity", "user_identity_contract", "user_identity_clear_program"),
    "trust_score": ("trust_score", "trust_score_contract", "trust_score_clear_program"),
    "certificate_management": ("certificate_management", "certificate_management_contract", "certificate_management_clear_program"),
    "badge_system": ("badge_system", "badge_system_contract", "badge_system_clear_program"),
    "smart_wallet": ("smart_wallet", "smart_wallet_contract", "smart_wallet_clear_program"),
    "governance": ("governance", "governance_contract", "governance_clear_program"),
    "dispute_resolution": ("dispute_resolution", "dispute_resolution_contract", "dispute_resolution_clear_program"),
    "paymaster": ("paymaster", "paymaster_contract", "paymaster_clear_program"),
}

def compile_teal_bytes(client: algod.AlgodClient, teal_src: str) -> bytes:
    resp = client.compile(teal_src)
    return base64.b64decode(resp['result'])

def deploy_one(name: str) -> int:
    if name not in CONTRACT_SCHEMAS:
        raise ValueError(f"Unknown contract: {name}")

    deployer_mn = os.getenv('DEPLOYER_MNEMONIC', '').strip()
    if not deployer_mn:
        raise RuntimeError('DEPLOYER_MNEMONIC not set')

    sk = mnemonic.to_private_key(deployer_mn)
    addr = account.address_from_private_key(sk)

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    params = client.suggested_params()

    # Build TEAL from PyTeal for this contract
    module_name, approval_fn, clear_fn = CONTRACT_BUILDERS[name]
    module = importlib.import_module(module_name)
    approval_teal = compileTeal(getattr(module, approval_fn)(), Mode.Application, version=8)
    clear_teal = compileTeal(getattr(module, clear_fn)(), Mode.Application, version=8)
    approval = compile_teal_bytes(client, approval_teal)
    clear = compile_teal_bytes(client, clear_teal)

    global_schema, local_schema = CONTRACT_SCHEMAS[name]

    txn = ApplicationCreateTxn(
        sender=addr,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval,
        clear_program=clear,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[]
    )

    stxn = txn.sign(sk)
    txid = client.send_transaction(stxn)
    res = transaction.wait_for_confirmation(client, txid, 4)
    app_id = res.get('application-index')
    return app_id

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python deployment/deploy_single.py <contract_name>')
        sys.exit(1)
    name = sys.argv[1]
    app_id = deploy_one(name)
    addr = get_application_address(app_id)

    # Update addresses file
    out_path = BASE_DIR / 'contract_addresses.json'
    try:
        data = json.loads(out_path.read_text()) if out_path.exists() else {}
    except Exception:
        data = {}

    deployer_mn = os.getenv('DEPLOYER_MNEMONIC', '').strip()
    deployer_addr = account.address_from_private_key(mnemonic.to_private_key(deployer_mn)) if deployer_mn else None

    if 'contracts' not in data:
        data = {
            'network': 'testnet',
            'deployer_address': deployer_addr,
            'deployment_timestamp': datetime.now(timezone.utc).isoformat(),
            'contracts': {}
        }

    data['network'] = 'testnet'
    data['deployer_address'] = deployer_addr
    data['deployment_timestamp'] = datetime.now(timezone.utc).isoformat()
    data['contracts'][name] = {
        'app_id': app_id,
        'address': addr,
        'deployer': deployer_addr,
        'deployment_txn': None
    }
    out_path.write_text(json.dumps(data, indent=2))

    print(json.dumps({"contract": name, "app_id": app_id, "address": addr}, indent=2))
