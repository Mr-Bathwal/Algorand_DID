import algosdk from 'algosdk';
import { appNoop } from './appCall';
import { loadContractAddresses } from './client';

const CONTRACTS = loadContractAddresses();

function strArg(s: string) {
  return new Uint8Array(Buffer.from(s));
}

export const Modules = {
  user_identity: {
    appId: CONTRACTS.user_identity.app_id,
    async registerUser(sender: string, email: string, phone: string) {
      return appNoop(sender, CONTRACTS.user_identity.app_id, [
        strArg('register_user'),
        strArg(email),
        strArg(phone),
      ]);
    },
  },
  organization_registry: {
    appId: CONTRACTS.organization_registry.app_id,
    async registerOrg(sender: string, name: string, type: string, country: string, website: string) {
      return appNoop(sender, CONTRACTS.organization_registry.app_id, [
        strArg('register_org'),
        strArg(name),
        strArg(type),
        strArg(country),
        strArg(website),
      ]);
    },
  },
  certificate_management: {
    appId: CONTRACTS.certificate_management.app_id,
  },
  badge_system: {
    appId: CONTRACTS.badge_system.app_id,
  },
  trust_score: {
    appId: CONTRACTS.trust_score.app_id,
  },
  smart_wallet: {
    appId: CONTRACTS.smart_wallet.app_id,
  },
  governance: {
    appId: CONTRACTS.governance.app_id,
  },
  dispute_resolution: {
    appId: CONTRACTS.dispute_resolution.app_id,
  },
};

