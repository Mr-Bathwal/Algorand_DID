import algosdk from 'algosdk';
import { getAlgod } from './client';

export async function appNoop(
  sender: string,
  appId: number,
  appArgs: Uint8Array[],
  boxes?: { appIndex?: number; name: Uint8Array }[]
): Promise<string> {
  const algod = getAlgod();
  const params = await algod.getTransactionParams().do();
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: sender,
    appIndex: appId,
    suggestedParams: params,
    appArgs,
    boxes,
  });
  return algosdk.encodeUnsignedTransaction(txn).toString('base64');
}

