# DID-Algorand — Self-Sovereign Identity & Credential Platform

![Algorand logo](https://cryptologos.cc/logos/algorand-algo-logo.png?v=024)

**DID-Algorand** is a privacy-first, self-sovereign identity platform built natively on Algorand. Users can create global, portable digital identities, receive verifiable credentials (e.g., university, work, KYC), prove claims using zero-knowledge proofs, and recover accounts via trusted guardians — all with *gasless, lightning-fast* UX.

**Hackathon Demo**

---

## 🚀 Features

- **Algorand-native Decentralized ID (DID):** Each user gets an Algorand Standard Asset as their unique, provable digital identity.
- **Verifiable Credentials:** Institutions issue JSON-LD credentials, signed and anchored on-chain.
- **Zero-Knowledge Proofs:** Users prove claims (age, degree, address) without revealing private details.
- **Web2/Web3 Onboarding:** Sign up with Google OAuth or Algorand wallet (Pera, Defly, WalletConnect).
- **Gasless UX:** All transactions can be sponsored by a paymaster for true onboarding simplicity.
- **Social Recovery:** Trusted guardians can help recover access if keys/devices are lost.
- **Organization Registry:** Build and verify group or institutional identities on-chain.
- **IPFS Integration:** Credential data is stored securely off-chain, with hashes anchored on-chain.

---

## 🌟 Quickstart

### 1. Python Setup

py -3 -m venv .venv
..venv\Scripts\Activate.ps1
pip install -r requirements.txt

text

### 2. Compile All Smart Contracts (Sanity Check)

python scripts/compile_all.py

text

### 3. Deploy to Algorand TestNet

1. Set environment variable with your deployer mnemonic (fund it on testnet first):

    ```
    $env:DEPLOYER_MNEMONIC = "your twenty five word mnemonic here"
    python deployment/deploy_all.py
    ```

2. Contract addresses will be written to:

    ```
    deployment/contract_addresses.json
    ```

---

## 🏗️ Architecture Overview

- **Smart Contracts:**
  - DID Registry (`user_identity`)
  - Guardian Management
  - Credential (VC) Registry
  - Organization Registry
  - Paymaster/Gas Relay Logic
- **Off-Chain Storage:** IPFS or Ceramic for user metadata and credentials.
- **ZK Proof Integration (Future):** Users generate proofs client-side; verification on-chain.

---

## 📊 Roadmap

- [x] Core Algorand contracts: Identity, Credentials, Orgs, Guardians  
- [x] Google OAuth + wallet integration  
- [x] IPFS integration for data storage  
- [ ] Frontend for easy onboarding and verification  
- [ ] ZK proof generation and demo circuits  
- [ ] Full B2B credential issuer API & dashboards  

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request.

---

## 📜 License

This project is licensed under the MIT License.  
