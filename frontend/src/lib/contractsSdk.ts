// Minimal TypeScript SDK exposing important functions per app for the frontend team.
// Install: npm i algosdk
// Usage: import { Contracts, Organization, UserIdentity, Certificates, Badges, TrustScore, SmartWallet, Governance, Disputes, buildNoopAppCall } from './contractsSdk';

import algosdk from 'algosdk';

/* --------------------------- Config / Addresses --------------------------- */

export const ALGOD_ADDRESS = 'https://testnet-api.algonode.cloud';
export const ALGOD_TOKEN = '';

export type ContractsConfig = {
  organization_registry: { app_id: number };
  user_identity: { app_id: number };
  trust_score: { app_id: number };
  certificate_management: { app_id: number };
  badge_system: { app_id: number };
  smart_wallet: { app_id: number };
  governance: { app_id: number };
  dispute_resolution: { app_id: number };
  paymaster: { app_id: number };
};

export const Contracts: ContractsConfig = {
  organization_registry: { app_id: 745680367 },
  user_identity: { app_id: 745680430 },
  trust_score: { app_id: 745680432 },
  certificate_management: { app_id: 745680498 },
  badge_system: { app_id: 745680508 },
  smart_wallet: { app_id: 745680538 },
  governance: { app_id: 745680789 },
  dispute_resolution: { app_id: 745680790 },
  paymaster: { app_id: 745692491 },
};

/* --------------------------------- Utils --------------------------------- */

export function getAlgod(): algosdk.Algodv2 {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_ADDRESS, '');
}

const te = new TextEncoder();
const strArg = (s: string) => te.encode(s);
const uintArg = (n: number | bigint) => algosdk.encodeUint64(Number(n));

/**
 * Build a NoOp application call (unsigned).
 * Frontend should sign with wallet (Pera / Defly / WalletConnect) and submit.
 */
export async function buildNoopAppCall(opts: {
  from: string;
  appId: number;
  appArgs: Uint8Array[];
  boxes?: { appIndex?: number; name: Uint8Array }[];
  foreignApps?: number[];
  foreignAssets?: number[];
}): Promise<algosdk.Transaction> {
  const algod = getAlgod();
  const sp = await algod.getTransactionParams().do();
  return algosdk.makeApplicationNoOpTxnFromObject({
    from: opts.from,
    suggestedParams: sp,
    appIndex: opts.appId,
    appArgs: opts.appArgs,
    boxes: opts.boxes,
    foreignApps: opts.foreignApps,
    foreignAssets: opts.foreignAssets,
  });
}

/* --------------------------- Module: Organization --------------------------- */

export const Organization = {
  async registerOrg(sender: string, name: string, type: string, country: string, website: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.organization_registry.app_id,
      appArgs: [strArg('register_org'), strArg(name), strArg(type), strArg(country), strArg(website)],
    });
  },
  async verifyOrg(sender: string, orgAddress: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.organization_registry.app_id,
      appArgs: [strArg('verify_org'), strArg(orgAddress)],
    });
  },
  async addAccreditation(sender: string, orgAddress: string, accreditationType: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.organization_registry.app_id,
      appArgs: [strArg('add_accreditation'), strArg(orgAddress), uintArg(accreditationType)],
    });
  },
  async updateOrgStatus(sender: string, orgAddress: string, newStatus: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.organization_registry.app_id,
      appArgs: [strArg('update_org_status'), strArg(orgAddress), uintArg(newStatus)],
    });
  },
  async getOrgInfo(sender: string, orgAddress: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.organization_registry.app_id,
      appArgs: [strArg('get_org_info'), strArg(orgAddress)],
    });
  },
};

/* ------------------------------ Module: User ------------------------------ */

export const UserIdentity = {
  async registerUser(sender: string, email: string, phone: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.user_identity.app_id,
      appArgs: [strArg('register_user'), strArg(email), strArg(phone)],
    });
  },
  async addVerification(sender: string, targetUser: string, verificationType: number, verifierId: number, verificationData: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.user_identity.app_id,
      appArgs: [strArg('add_verification'), strArg(targetUser), uintArg(verificationType), uintArg(verifierId), strArg(verificationData)],
      boxes: [{ name: te.encode('user_' + targetUser) }],
    });
  },
  async getUserProfile(sender: string, targetUser: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.user_identity.app_id,
      appArgs: [strArg('get_user_profile'), strArg(targetUser)],
    });
  },
  async addVerifier(sender: string, verifierId: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.user_identity.app_id,
      appArgs: [strArg('add_verifier'), uintArg(verifierId)],
    });
  },
  async revokeVerification(sender: string, targetUser: string, verificationType: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.user_identity.app_id,
      appArgs: [strArg('revoke_verification'), strArg(targetUser), uintArg(verificationType)],
    });
  },
};

/* ------------------------------ Module: Paymaster ------------------------------ */

export const Paymaster = {
  async sponsor(sender: string, targetAppId: number, flatFee: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.paymaster.app_id,
      appArgs: [strArg('sponsor'), uintArg(targetAppId), uintArg(flatFee)],
      boxes: [{ name: te.encode('wl_' + targetAppId) }],
    });
  },
  async getSponsorInfo(sender: string, targetAppId: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.paymaster.app_id,
      appArgs: [strArg('get_sponsor_info'), uintArg(targetAppId)],
    });
  },
};



/* ------------------------- Module: Certificates --------------------------- */

export const Certificates = {
  async issueCertificate(
    sender: string,
    recipientAddr: string,
    certType: string,
    certName: string,
    courseDetails: string,
    gradeInfo: string,
    issueDateUnix: number,
    expiryDateUnix: number
  ) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.certificate_management.app_id,
      appArgs: [
        strArg('issue_cert'),
        strArg(recipientAddr),
        strArg(certType),
        strArg(certName),
        strArg(courseDetails),
        strArg(gradeInfo),
        uintArg(issueDateUnix),
        uintArg(expiryDateUnix),
      ],
    });
  },
  async verifyCertificate(sender: string, certId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('verify_cert'), uintArg(certId)] });
  },
  async revokeCertificate(sender: string, certId: number, reason: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('revoke_cert'), uintArg(certId), strArg(reason)] });
  },
  async transferCertificate(sender: string, certId: number, newOwner: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('transfer_cert'), uintArg(certId), strArg(newOwner)] });
  },
  async batchIssue(sender: string, batchSize: number, template: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('batch_issue'), uintArg(batchSize), strArg(template)] });
  },
  async getCertificate(sender: string, certId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('get_cert'), uintArg(certId)] });
  },
  async getUserCertificates(sender: string, userAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('get_user_certs'), strArg(userAddr)] });
  },
};

/* --------------------------- Module: Badges ------------------------------- */

export const Badges = {
  async createTemplate(sender: string, name: string, type: number, description: string, criteria: string, iconUrl: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('create_template'), strArg(name), uintArg(type), strArg(description), strArg(criteria), strArg(iconUrl)] });
  },
  async issueBadge(sender: string, recipient: string, templateId: number, evidence: string, metadata: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('issue_badge'), strArg(recipient), uintArg(templateId), strArg(evidence), strArg(metadata)] });
  },
  async nominateBadge(sender: string, nominee: string, templateId: number, reason: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('nominate_badge'), strArg(nominee), uintArg(templateId), strArg(reason)] });
  },
  async voteNomination(sender: string, nominationId: number, vote: 0 | 1) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('vote_nomination'), uintArg(nominationId), uintArg(vote)] });
  },
  async stackBadges(sender: string, count: number, name: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('stack_badges'), uintArg(count), strArg(name)] });
  },
  async getBadge(sender: string, badgeId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('get_badge'), uintArg(badgeId)] });
  },
  async getUserBadges(sender: string, userAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('get_user_badges'), strArg(userAddr)] });
  },
  async revokeBadge(sender: string, badgeId: number, reason: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('revoke_badge'), uintArg(badgeId), strArg(reason)] });
  },
};

/* -------------------------- Module: Trust Score --------------------------- */

export const TrustScore = {
  async initScore(sender: string, userAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('init_score'), strArg(userAddr)] });
  },
  async updateScore(
    sender: string,
    userAddr: string,
    verificationLevel: number,
    verificationsCount: number,
    totalCertificates: number,
    highTrustCerts: number,
    avgOrgTrust: number,
    badgesEarned: number,
    endorsementsReceived: number
  ) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.trust_score.app_id,
      appArgs: [
        strArg('update_score'),
        strArg(userAddr),
        uintArg(verificationLevel),
        uintArg(verificationsCount),
        uintArg(totalCertificates),
        uintArg(highTrustCerts),
        uintArg(avgOrgTrust),
        uintArg(badgesEarned),
        uintArg(endorsementsReceived),
      ],
    });
  },
  async getScore(sender: string, userAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('get_score'), strArg(userAddr)] });
  },
  async addEndorsement(sender: string, endorseeAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('add_endorsement'), strArg(endorseeAddr)] });
  },
};

/* --------------------------- Module: Smart Wallet -------------------------- */

export const SmartWallet = {
  async createWallet(sender: string, guardianCount: number, threshold: number, dailyLimitMicroAlgos: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('create_wallet'), uintArg(guardianCount), uintArg(threshold), uintArg(dailyLimitMicroAlgos)] });
  },
  async addGuardian(sender: string, guardianAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('add_guardian'), strArg(guardianAddr)] });
  },
  async removeGuardian(sender: string, guardianAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('remove_guardian'), strArg(guardianAddr)] });
  },
  async initiateRecovery(sender: string, walletOwner: string, newOwnerCandidate: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('initiate_recovery'), strArg(walletOwner), strArg(newOwnerCandidate)] });
  },
  async confirmRecovery(sender: string, walletOwner: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('confirm_recovery'), strArg(walletOwner)] });
  },
  async executeRecovery(sender: string, walletOwner: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('execute_recovery'), strArg(walletOwner)] });
  },
  async executePayment(sender: string, recipient: string, amountMicroAlgos: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('execute_tx'), strArg(recipient), uintArg(amountMicroAlgos)] });
  },
  async setDailyLimit(sender: string, newLimitMicroAlgos: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('set_daily_limit'), uintArg(newLimitMicroAlgos)] });
  },
  async getWalletInfo(sender: string, walletAddr: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('get_wallet_info'), strArg(walletAddr)] });
  },
};

/* --------------------------- Module: Governance --------------------------- */

export const Governance = {
  async createProposal(sender: string, proposalType: number, title: string, description: string, executionData: string, votingDurationSecs: number) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.governance.app_id,
      appArgs: [strArg('create_proposal'), uintArg(proposalType), strArg(title), strArg(description), strArg(executionData), uintArg(votingDurationSecs)],
    });
  },
  async voteProposal(sender: string, proposalId: number, vote: 0 | 1, voterTrustScore: number, voterStakeMicroAlgos: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('vote_proposal'), uintArg(proposalId), uintArg(vote), uintArg(voterTrustScore), uintArg(voterStakeMicroAlgos)] });
  },
  async executeProposal(sender: string, proposalId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('execute_proposal'), uintArg(proposalId)] });
  },
  async getProposal(sender: string, proposalId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('get_proposal'), uintArg(proposalId)] });
  },
  async getResults(sender: string, proposalId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('get_results'), uintArg(proposalId)] });
  },
  async delegateVote(sender: string, delegateTo: string, proposalId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('delegate_vote'), strArg(delegateTo), uintArg(proposalId)] });
  },
  async updateParams(sender: string, name: 'min_trust_score' | 'min_stake' | 'voting_period' | 'quorum_threshold', value: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('update_params'), strArg(name), uintArg(value)] });
  },
};

/* ----------------------- Module: Dispute Resolution ----------------------- */

export const Disputes = {
  async fileDispute(sender: string, disputeType: number, defendantAddr: string, subjectId: number, description: string, evidence: string, requestedRemedy: string) {
    return buildNoopAppCall({
      from: sender,
      appId: Contracts.dispute_resolution.app_id,
      appArgs: [strArg('file_dispute'), uintArg(disputeType), strArg(defendantAddr), uintArg(subjectId), strArg(description), strArg(evidence), strArg(requestedRemedy)],
    });
  },
  async selectJury(sender: string, disputeId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('select_jury'), uintArg(disputeId)] });
  },
  async submitEvidence(sender: string, disputeId: number, evidenceType: string, evidenceData: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('submit_evidence'), uintArg(disputeId), strArg(evidenceType), strArg(evidenceData)] });
  },
  async castVote(sender: string, disputeId: number, vote: 1 | 2, reasoning: string) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('cast_vote'), uintArg(disputeId), uintArg(vote), strArg(reasoning)] });
  },
  async executeVerdict(sender: string, disputeId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('execute_verdict'), uintArg(disputeId)] });
  },
  async getDispute(sender: string, disputeId: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('get_dispute'), uintArg(disputeId)] });
  },
  async joinJuryPool(sender: string, trustScore: number, stakeAmountMicroAlgos: number) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('join_jury_pool'), uintArg(trustScore), uintArg(stakeAmountMicroAlgos)] });
  },
};

/* ------------------------- Sponsored Transactions --------------------------- */

export interface SponsoredGroupOptions {
  sponsor: string;
  user: string;
  paymasterAppId: number;
  targetAppId: number;
  targetArgs: Uint8Array[];
  targetBoxes?: { name: Uint8Array }[];
  flatFee?: number;
}

export async function buildSponsoredGroup(opts: SponsoredGroupOptions): Promise<{
  tx0: algosdk.Transaction; // Paymaster sponsor
  tx1: algosdk.Transaction; // Target app call
}> {
  const algod = getAlgod();
  const params = await algod.getTransactionParams().do();
  
  // Transaction 0: Paymaster sponsor
  const tx0 = algosdk.makeApplicationNoOpTxn(
    opts.sponsor,
    { ...params, fee: 0 }, // Sponsor pays
    opts.paymasterAppId,
    [strArg('sponsor'), uintArg(opts.targetAppId), uintArg(opts.flatFee || 3000)],
    undefined,
    undefined,
    undefined,
    [{ name: te.encode('wl_' + opts.targetAppId) }]
  );
  
  // Transaction 1: Target app call
  const tx1 = algosdk.makeApplicationNoOpTxn(
    opts.user,
    { ...params, fee: 0 }, // User pays 0
    opts.targetAppId,
    opts.targetArgs,
    undefined,
    undefined,
    undefined,
    opts.targetBoxes
  );
  
  return { tx0, tx1 };
}
