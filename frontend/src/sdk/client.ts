import algosdk from 'algosdk';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export function getAlgod(): algosdk.Algodv2 {
  const address = process.env.ALGOD_ADDRESS || 'https://testnet-api.algonode.cloud';
  const token = process.env.ALGOD_TOKEN || '';
  return new algosdk.Algodv2(token, address, '');
}

export function getSenderFromMnemonic(): { addr: string; sk: Uint8Array } {
  const m = (process.env.SENDER_MNEMONIC || '').trim();
  if (!m) throw new Error('SENDER_MNEMONIC not set');
  const sk = algosdk.mnemonicToSecretKey(m);
  return { addr: sk.addr, sk: sk.sk };
}

export function loadContractAddresses(): Record<string, { app_id: number; address: string }> {
  const base = path.resolve(process.cwd(), '..');
  const p = path.join(base, 'deployment', 'contract_addresses.json');
  const raw = fs.readFileSync(p, 'utf8');
  const json = JSON.parse(raw);
  return json.contracts || {};
}

