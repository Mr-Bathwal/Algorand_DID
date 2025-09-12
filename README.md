# Algorand Identity & AA Wallet Platform (Hackathon)

Concise, gasless identity and credential rails on Algorand with a Paymaster, Account Abstraction-style Smart Wallet, and modular registries. All core flows work now; the roadmap adds ZK proofs and IPFS-only data with on-chain hashing.

## Problem → Solution
- Problem: Onboarding to on-chain identity and credentials is hard (fees, UX, fragmentation), and custodial KYC leaks data.
- Solution: Algorand-native contracts for identity, orgs, badges, governance, trust scores, plus a Smart Wallet and Paymaster so users sign once and pay 0 fees. Data hashes are anchored on-chain; full data sits off-chain (IPFS in roadmap). ZK gates protect privacy for selective disclosure.

## Deployed (TestNet)
See `deployment/contract_addresses.json` for the latest.
- organization_registry: app_id 745680367
- user_identity: app_id 745680430
- trust_score: app_id 745680432
- certificate_management: app_id 745680498
- badge_system: app_id 745680508
- smart_wallet: app_id 745680538 (escrow address in the JSON file)
- governance: app_id 745680789
- dispute_resolution: app_id 745680790
- paymaster: app_id 745692491

## Features (Now)
- Identity (user_identity): register user, add/revoke verifications, profile read, verifier registry.
- Organizations (organization_registry): register/verify orgs, accreditations, trust score updates.
- Certificates (certificate_management): issue/verify/revoke/transfer; batch issue; per-user index.
- Badges (badge_system): templates, issuance, nominations, votes, stacking, per-user index.
- Trust Score (trust_score): initialize/update, endorsements, weighted components.
- Governance (governance): proposals, votes, execution, params.
- Disputes (dispute_resolution): file, jury select, evidence, vote, verdict.
- Smart Wallet (smart_wallet): create/add/remove guardians, daily limit, recovery (init/confirm/execute), inner ALGO transfers, get_wallet_info.
- Admin controls: set_admin, pause/unpause, version across all modules.
- Paymaster (paymaster): sponsor any whitelisted target app via 2-txn group. User fee=0.

## Roadmap (Upcoming)
- ZK Proofs: client-side proof generation; on-chain verification paths for common claims.
- IPFS-only storage: no PII on-chain; store only hashes/commitments (already structured for off-chain anchoring).
- AA Enhancements: method-level paymaster whitelists, rate limits, per-user quotas, JWT-bound sponsorship.
- Multi-asset wallet ops and cross-app composability.

## Sponsor Flow (Paymaster)
- Group of 2:
  1) tx0: Paymaster.sponsor (flatFee, fee≈0.003 ALGO), includes box `wl_<targetAppId>`
  2) tx1: Target AppCall (fee=0)
- We provide `buildSponsoredGroup` in `frontend/src/contractsSdk.js` that adds the correct whitelist box automatically.

## Smart Wallet Notes
- Escrow address is the app address of `smart_wallet` (see JSON). Fund it to enable inner payments.
- Owner is `Txn.sender()` at create; Paymaster sponsorship lets the user pay 0 while still being owner.

## Repo Layout
- contracts/*.py — PyTeal contracts
- utils/common.py — helpers, hashing, box utilities
- deployment/*.py — deploy, whitelist, fund scripts; `contract_addresses.json`
- frontend/src/contractsSdk.js — minimal ESM SDK (JS)
- frontend/src/scripts/* — demo scripts (sponsored version call, create wallet)
- tests/test_smoke.py — smoke tests against deployed apps

## Setup (Python)
```
py -3 -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
```

## Deploy (TestNet)
1) Set `.env`:
```
ALGOD_ADDRESS=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
DEPLOYER_MNEMONIC=25 words here
```
2) Deploy all:
```
python deployment/deploy_all.py
```
3) Optional: Fund app escrows and whitelist via helpers:
```
python deployment/fund_smart_wallet.py
python deployment/whitelist_paymaster.py
```

## SDK (Frontend/Backend)
- Import from `frontend/src/contractsSdk.js`.
- Sponsored call builder:
```js
const { tx0, tx1 } = await buildSponsoredGroup({
  sponsor: SPONSOR_ADDR,
  user: USER_ADDR,
  paymasterAppId: Contracts.paymaster.app_id,
  targetAppId: Contracts.governance.app_id,
  targetArgs: [new TextEncoder().encode('version')]
});
// user signs tx1; backend signs tx0; submit both
```

## Demos
- Sponsored version check:
```
node frontend/src/scripts/demo_sponsored_version.js
```
- Create Smart Wallet (sponsored):
```
node frontend/src/scripts/demo_create_smart_wallet.js
```

## Tests
```
.venv/Scripts/python -m pytest -q -s tests/test_smoke.py
```

## Security/Privacy
- Minimization: no PII on-chain; only hashes/commitments (IPFS planned).
- ZK roadmap for selective disclosure.
- Admin rotation and pause across modules.

## License
MIT
