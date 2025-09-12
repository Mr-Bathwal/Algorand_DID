import 'dotenv/config';
import algosdk from 'algosdk';
import { getAlgod, getSenderFromMnemonic } from '../sdk/client';
import { Modules } from '../sdk/modules';

async function main() {
  const algod = getAlgod();
  const { addr, sk } = getSenderFromMnemonic();

  const stxnb64 = await Modules.user_identity.registerUser(
    addr,
    'alice@example.com',
    '+15555550123'
  );

  const stxn = new Uint8Array(Buffer.from(stxnb64, 'base64'));
  const txn = algosdk.decodeUnsignedTransaction(stxn);
  const signed = txn.signTxn(sk);
  const txid = await algod.sendRawTransaction(signed).do();
  const res = await algosdk.waitForConfirmation(algod, txid.txId || txid, 4);
  console.log('register_user confirmed in round', res['confirmed-round']);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

