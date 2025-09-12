// Demo: Create Smart Wallet via Paymaster sponsorship
// Usage: node frontend/src/scripts/demo_create_smart_wallet.js
// Env: SPONSOR_MNEMONIC, USER_MNEMONIC (optional; defaults to sponsor)

import 'dotenv/config';
import algosdk from 'algosdk';
import { getAlgod, Contracts, buildSponsoredGroup } from '../contractsSdk.js';

const te = new TextEncoder();
const enc = (s) => te.encode(s);

async function main() {
  const sponsorMn = process.env.SPONSOR_MNEMONIC || process.env.DEPLOYER_MNEMONIC;
  const userMn = process.env.USER_MNEMONIC || sponsorMn;
  if (!sponsorMn) throw new Error('Set SPONSOR_MNEMONIC or DEPLOYER_MNEMONIC');

  const sponsor = algosdk.mnemonicToSecretKey(sponsorMn);
  const user = algosdk.mnemonicToSecretKey(userMn);

  const paymasterAppId = Contracts.paymaster.app_id;
  const targetAppId = Contracts.smart_wallet.app_id;

  // Smart Wallet create_wallet(guardianCount=1, threshold=1, dailyLimit=200000)
  const targetArgs = [
    enc('create_wallet'),
    algosdk.encodeUint64(1),
    algosdk.encodeUint64(1),
    algosdk.encodeUint64(200000),
  ];

  // No boxes needed for create, so omit targetBoxes
  const { tx0, tx1 } = await buildSponsoredGroup({
    sponsor: sponsor.addr,
    user: user.addr,
    paymasterAppId,
    targetAppId,
    targetArgs,
  });

  const stx1 = tx1.signTxn(user.sk);
  const stx0 = tx0.signTxn(sponsor.sk);

  const algod = getAlgod();
  const { txId } = await algod.sendRawTransaction([stx0, stx1]).do();
  console.log('Submitted group txId (first):', txId);
  await algosdk.waitForConfirmation(algod, txId, 4);
  console.log('Smart wallet created (or already existed).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


