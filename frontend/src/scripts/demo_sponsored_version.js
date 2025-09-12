// Demo: Sponsored version call using Paymaster
// Usage: node frontend/src/scripts/demo_sponsored_version.js
// Env: SPONSOR_MNEMONIC (25 words), USER_MNEMONIC (optional; defaults to sponsor)

import 'dotenv/config';
import algosdk from 'algosdk';
import { getAlgod, Contracts, buildSponsoredGroup } from '../contractsSdk.js';

const te = new TextEncoder();
const enc = (s) => te.encode(s);

async function main() {
  const sponsorMn = process.env.SPONSOR_MNEMONIC || process.env.DEPLOYER_MNEMONIC;
  const userMn = process.env.USER_MNEMONIC || sponsorMn;
  if (!sponsorMn) throw new Error('Set SPONSOR_MNEMONIC or DEPLOYER_MNEMONIC');

  const sponsorSk = algosdk.mnemonicToSecretKey(sponsorMn).sk;
  const sponsorAddr = algosdk.mnemonicToSecretKey(sponsorMn).addr;
  const userSk = algosdk.mnemonicToSecretKey(userMn).sk;
  const userAddr = algosdk.mnemonicToSecretKey(userMn).addr;

  const paymasterAppId = Contracts.paymaster.app_id;
  const targetAppId = Contracts.governance.app_id; // example target
  const targetArgs = [enc('version')];

  const { tx0, tx1 } = await buildSponsoredGroup({
    sponsor: sponsorAddr,
    user: userAddr,
    paymasterAppId,
    targetAppId,
    targetArgs,
  });

  const stx1 = tx1.signTxn(userSk);
  const stx0 = tx0.signTxn(sponsorSk);

  const algod = getAlgod();
  const { txId } = await algod.sendRawTransaction([stx0, stx1]).do();
  console.log('Submitted group txId (first):', txId);
  await algosdk.waitForConfirmation(algod, txId, 4);
  console.log('Confirmed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


