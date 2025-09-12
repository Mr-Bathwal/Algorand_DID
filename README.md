Decentralized Credential & Organization Registry Platform
========================================================

Quickstart
----------

1) Python setup

```bash
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Compile all contracts to TEAL (sanity check)

```bash
python scripts\compile_all.py
```

3) Deploy to Algorand TestNet

Set environment variable with the deployer mnemonic (fund it on testnet):

```powershell
$env:DEPLOYER_MNEMONIC = "your twenty five word mnemonic here"
python deployment\deploy_all.py
```

Addresses will be written to `deployment/contract_addresses.json`.

Frontend integration notes are at the end of this file.

Frontend Integration (Outline)
------------------------------

- Use `@algorandfoundation/algokit-utils` or `algosdk` in your frontend.
- Read `deployment/contract_addresses.json` at build-time or fetch it from your backend to know app IDs.
- For wallet: integrate Pera Wallet or Defly. For web: use WalletConnect v2.
- Application call example (pseudo):

```js
import algosdk from 'algosdk';

const client = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '');
const params = await client.getTransactionParams().do();
const appId = CONTRACTS.user_identity.app_id;

// call: register_user(email, phone)
const args = [
  new Uint8Array(Buffer.from('register_user')),
  new Uint8Array(Buffer.from('alice@example.com')),
  new Uint8Array(Buffer.from('+15555550123')),
];

const txn = algosdk.makeApplicationNoOpTxnFromObject({
  from: sender,
  appIndex: appId,
  suggestedParams: params,
  appArgs: args,
});
```


