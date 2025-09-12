import os
import json
from pathlib import Path
from dotenv import load_dotenv
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from algosdk.logic import get_application_address


def itob(i: int) -> bytes:
    return i.to_bytes(8, 'big')


def main():
    load_dotenv()
    base_dir = Path(__file__).resolve().parent
    addr_path = base_dir / 'contract_addresses.json'
    if not addr_path.exists():
        raise RuntimeError('deployment/contract_addresses.json not found')

    data = json.loads(addr_path.read_text())
    contracts = data.get('contracts', {})
    if 'paymaster' not in contracts:
        raise RuntimeError('Paymaster not deployed yet. Deploy it first.')

    paymaster_id = contracts['paymaster']['app_id']

    ALGOD_ADDRESS = os.getenv('ALGOD_ADDRESS', 'https://testnet-api.algonode.cloud')
    ALGOD_TOKEN = os.getenv('ALGOD_TOKEN', '')
    mn = os.getenv('DEPLOYER_MNEMONIC', '')
    if not mn:
        raise RuntimeError('DEPLOYER_MNEMONIC not set')

    sk = mnemonic.to_private_key(mn)
    sender = account.address_from_private_key(sk)
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

    # Ensure paymaster is funded for box MBR
    paymaster_addr = get_application_address(paymaster_id)
    acct = client.account_info(paymaster_addr)
    bal = acct.get('amount', 0)
    # target balance to safely cover ~8 boxes and ops (~5 ALGO)
    target_bal = 5_000_000
    if bal < target_bal:
        params = client.suggested_params()
        fund_txn = transaction.PaymentTxn(
            sender=sender,
            sp=params,
            receiver=paymaster_addr,
            amt=target_bal - bal
        )
        st = fund_txn.sign(sk)
        fund_txid = client.send_transaction(st)
        transaction.wait_for_confirmation(client, fund_txid, 4)
        print(f"Funded paymaster {paymaster_id} with {(target_bal - bal)/1e6:.2f} ALGO")

    # Build whitelist list: all app IDs except paymaster
    target_app_ids = []
    for name, info in contracts.items():
        if name == 'paymaster':
            continue
        app_id = info.get('app_id')
        if app_id:
            target_app_ids.append(int(app_id))

    if not target_app_ids:
        print('No target apps to whitelist.')
        return

    print(f'Whitelisting {len(target_app_ids)} apps in Paymaster {paymaster_id} ...')

    params = client.suggested_params()

    for app_id in target_app_ids:
        box_name = b'wl_' + itob(app_id)
        txn = transaction.ApplicationNoOpTxn(
            sender=sender,
            sp=params,
            index=paymaster_id,
            app_args=[b'add_wl', itob(app_id), b''],
            boxes=[(paymaster_id, box_name)],
        )
        stxn = txn.sign(sk)
        txid = client.send_transaction(stxn)
        transaction.wait_for_confirmation(client, txid, 4)
        print(f'  ✓ whitelisted app {app_id}')

    print('Done.')


if __name__ == '__main__':
    main()


