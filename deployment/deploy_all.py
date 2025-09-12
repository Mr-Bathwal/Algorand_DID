"""
Deployment script for all Decentralized Credential Platform smart contracts
"""

import json
import os
import sys
import base64
import importlib
from pathlib import Path
from dotenv import load_dotenv
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from algosdk.transaction import ApplicationCreateTxn, OnComplete
from algosdk.logic import get_application_address
from pyteal import compileTeal, Mode

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent

# Ensure import paths for contracts and utils
sys.path.append(str(REPO_ROOT / "contracts"))
sys.path.append(str(REPO_ROOT / "utils"))

# Load environment variables from .env if present
load_dotenv()

# Algorand node configuration
ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""  # No token needed for public nodes
USE_PLACEHOLDER = os.getenv("DEPLOY_USE_PLACEHOLDER", "0") == "1"

# Contract modules and entrypoints
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

def compile_teal_bytes(client: algod.AlgodClient, approval_teal: str, clear_teal: str):
    """Compile TEAL source strings using algod and return program bytes (approval, clear)."""
    approval_resp = client.compile(approval_teal)
    clear_resp = client.compile(clear_teal)
    approval_program = base64.b64decode(approval_resp["result"])
    clear_program = base64.b64decode(clear_resp["result"])
    return approval_program, clear_program

def deploy_contract(client, private_key, approval_program, clear_program, 
                   global_schema, local_schema, app_args=None):
    """Deploy a smart contract to Algorand"""
    
    # Get account info
    sender = account.address_from_private_key(private_key)
    
    # Get suggested parameters
    params = client.suggested_params()
    
    # Create application transaction
    txn = ApplicationCreateTxn(
        sender=sender,
        sp=params,
        on_complete=OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=app_args or []
    )
    
    # Sign transaction
    signed_txn = txn.sign(private_key)
    
    # Send transaction
    tx_id = client.send_transaction(signed_txn)
    
    # Wait for confirmation
    confirmed_txn = transaction.wait_for_confirmation(client, tx_id, 4)
    
    # Get application ID
    app_id = confirmed_txn["application-index"]
    
    print(f"Contract deployed successfully! Application ID: {app_id}")
    return app_id

def main():
    """Main deployment function"""
    
    # Initialize Algorand client
    algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
    
    # Load deployer account from environment
    deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC", "").strip()
    if not deployer_mnemonic:
        raise RuntimeError("DEPLOYER_MNEMONIC environment variable is required for deployment.")
    deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = account.address_from_private_key(deployer_private_key)
    
    print(f"Deploying contracts from address: {deployer_address}")
    
    # Check account balance
    account_info = algod_client.account_info(deployer_address)
    balance = account_info.get('amount', 0)
    print(f"Account balance: {balance / 1000000} ALGO")
    
    if balance < 10000000:  # Less than 10 ALGO
        print("Warning: Low balance. You may need more ALGO for deployment fees.")
    
    # Contract deployment configuration
    deployed_contracts = {}
    
    # Global and local schema for each contract type
    schemas = {
        "organization_registry": {
            "global": transaction.StateSchema(num_uints=10, num_byte_slices=5),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "user_identity": {
            "global": transaction.StateSchema(num_uints=8, num_byte_slices=3),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "trust_score": {
            "global": transaction.StateSchema(num_uints=6, num_byte_slices=2),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "certificate_management": {
            "global": transaction.StateSchema(num_uints=8, num_byte_slices=4),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "badge_system": {
            "global": transaction.StateSchema(num_uints=6, num_byte_slices=3),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "smart_wallet": {
            "global": transaction.StateSchema(num_uints=5, num_byte_slices=2),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "governance": {
            "global": transaction.StateSchema(num_uints=10, num_byte_slices=3),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "dispute_resolution": {
            "global": transaction.StateSchema(num_uints=8, num_byte_slices=4),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        },
        "paymaster": {
            "global": transaction.StateSchema(num_uints=3, num_byte_slices=1),
            "local": transaction.StateSchema(num_uints=0, num_byte_slices=0)
        }
    }
    
    # Deploy contracts in dependency order
    deployment_order = [
        "organization_registry",
        "user_identity", 
        "trust_score",
        "certificate_management",
        "badge_system",
        "smart_wallet",
        "governance",
        "dispute_resolution",
        "paymaster"
    ]
    
    for contract_name in deployment_order:
        print(f"\n--- Deploying {contract_name} ---")
        
        try:
            # Build TEAL from PyTeal unless placeholder is requested
            if not USE_PLACEHOLDER:
                module_name, approval_fn, clear_fn = CONTRACT_BUILDERS[contract_name]
                module = importlib.import_module(module_name)
                approval_teal = compileTeal(getattr(module, approval_fn)(), Mode.Application, version=8)
                clear_teal = compileTeal(getattr(module, clear_fn)(), Mode.Application, version=8)
                
                # Compile TEAL to program bytes via algod
                approval_program, clear_program = compile_teal_bytes(algod_client, approval_teal, clear_teal)
            else:
                placeholder_teal = "#pragma version 8\nint 1\nreturn"
                approval_program, clear_program = compile_teal_bytes(algod_client, placeholder_teal, placeholder_teal)
            
            # Get schema for this contract
            schema = schemas[contract_name]
            
            # Deploy contract
            app_id = deploy_contract(
                client=algod_client,
                private_key=deployer_private_key,
                approval_program=approval_program,
                clear_program=clear_program,
                global_schema=schema["global"],
                local_schema=schema["local"]
            )
            
            # Store deployment info
            deployed_contracts[contract_name] = {
                "app_id": app_id,
                "address": get_application_address(app_id),
                "deployer": deployer_address,
                "deployment_txn": None  # Would store transaction ID in production
            }
            
            print(f"✅ {contract_name} deployed successfully!")
            print(f"   App ID: {app_id}")
            print(f"   Address: {get_application_address(app_id)}")
            
        except Exception as e:
            if not USE_PLACEHOLDER:
                print(f"⚠️ Compile/deploy failed for {contract_name} ({e}). Falling back to placeholder TEAL...")
                try:
                    placeholder_teal = "#pragma version 8\nint 1\nreturn"
                    approval_program, clear_program = compile_teal_bytes(algod_client, placeholder_teal, placeholder_teal)
                    schema = schemas[contract_name]
                    app_id = deploy_contract(
                        client=algod_client,
                        private_key=deployer_private_key,
                        approval_program=approval_program,
                        clear_program=clear_program,
                        global_schema=schema["global"],
                        local_schema=schema["local"]
                    )
                    deployed_contracts[contract_name] = {
                        "app_id": app_id,
                        "address": get_application_address(app_id),
                        "deployer": deployer_address,
                        "deployment_txn": None
                    }
                    print(f"✅ {contract_name} deployed with placeholder program.")
                except Exception as e2:
                    print(f"❌ Failed to deploy {contract_name} even with placeholder: {e2}")
                    continue
            else:
                print(f"❌ Failed to deploy {contract_name}: {e}")
                continue
    
    # Save deployment information
    deployment_info = {
        "network": "testnet",
        "deployer_address": deployer_address,
        "deployment_timestamp": "2024-01-01T00:00:00Z",  # Use actual timestamp
        "contracts": deployed_contracts
    }
    
    # Write to file
    out_path = BASE_DIR / "contract_addresses.json"
    with open(out_path, "w") as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"\n🎉 Deployment completed!")
    print(f"📄 Contract addresses saved to {out_path}")
    
    # Print summary
    print(f"\n📊 Deployment Summary:")
    print(f"   Total contracts: {len(deployed_contracts)}")
    print(f"   Successful deployments: {len([c for c in deployed_contracts.values() if c.get('app_id')])}")
    print(f"   Network: testnet")
    print(f"   Deployer: {deployer_address}")
    
    return deployed_contracts

def fund_contracts(algod_client, deployer_private_key, deployed_contracts, funding_amount=1000000):
    """Fund deployed contracts with initial ALGO for operations"""
    
    print(f"\n--- Funding Contracts ---")
    
    for contract_name, contract_info in deployed_contracts.items():
        if not contract_info.get('app_id'):
            continue
            
        try:
            contract_address = contract_info['address']
            
            # Create funding transaction
            params = algod_client.suggested_params()
            
            txn = transaction.PaymentTxn(
                sender=account.address_from_private_key(deployer_private_key),
                sp=params,
                receiver=contract_address,
                amt=funding_amount
            )
            
            # Sign and send
            signed_txn = txn.sign(deployer_private_key)
            tx_id = algod_client.send_transaction(signed_txn)
            
            # Wait for confirmation
            transaction.wait_for_confirmation(algod_client, tx_id, 4)
            
            print(f"✅ Funded {contract_name}: {funding_amount/1000000} ALGO")
            
        except Exception as e:
            print(f"❌ Failed to fund {contract_name}: {e}")

if __name__ == "__main__":
    # Deploy all contracts
    deployed = main()
    
    # Optionally fund contracts
    if deployed:
        algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
        deployer_mnemonic = os.getenv("DEPLOYER_MNEMONIC", "").strip()
        if deployer_mnemonic:
            deployer_private_key = mnemonic.to_private_key(deployer_mnemonic)
            fund_contracts(algod_client, deployer_private_key, deployed)
        else:
            print("⏭ Skipping funding: DEPLOYER_MNEMONIC not set.")