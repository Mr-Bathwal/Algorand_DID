import os
import json
from pathlib import Path
from dotenv import load_dotenv
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from algosdk.logic import get_application_address


def main():
    load_dotenv()
    base_dir = Path(__file__).resolve().parent
    addr_path = base_dir / 'contract_addresses.json'
    if not addr_path.exists():
        raise RuntimeError('deployment/contract_addresses.json not found')

    data = json.loads(addr_path.read_text())
    contracts = data.get('contracts', {})
    if 'smart_wallet' not in contracts:
        raise RuntimeError('smart_wallet not found in contract_addresses.json')

    app_id = int(contracts['smart_wallet']['app_id'])
    wallet_addr = get_application_address(app_id)

    ALGOD_ADDRESS = os.getenv('ALGOD_ADDRESS', 'https://testnet-api.algonode.cloud')
    ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')
    mn = os.getenv('DEPLOYER_MNEMONIC', '').strip()
    if not mn:
        raise RuntimeError('DEPLOYER_MNEMONIC not set')

    sk = mnemonic.to_private_key(mn)
    sender = account.address_from_private_key(sk)
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    amt_algos = float(os.getenv('FUND_WALLET_ALGOS', '2'))  # default 2 ALGO
    amt = int(amt_algos * 1_000_000)

    params = client.suggested_params()
    txn = transaction.PaymentTxn(sender=sender, sp=params, receiver=wallet_addr, amt=amt)
    stx = txn.sign(sk)
    txid = client.send_transaction(stx)
    transaction.wait_for_confirmation(client, txid, 4)
    print(f'Funded smart_wallet app {app_id} escrow {wallet_addr} with {amt_algos} ALGO. txid={txid}')


if __name__ == '__main__':
    main()


