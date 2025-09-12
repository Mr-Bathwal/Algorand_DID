// Minimal JavaScript SDK (ESM) exposing important functions per app for the frontend team.
// Install: npm i algosdk
// Usage: import { Contracts, Organization, UserIdentity, Certificates, Badges, TrustScore, SmartWallet, Governance, Disputes, buildNoopAppCall } from './contractsSdk.js';

import algosdk from 'algosdk';

/* --------------------------- Config / Addresses --------------------------- */

export const ALGOD_ADDRESS = 'https://testnet-api.algonode.cloud';
export const ALGOD_TOKEN = '';

export const Contracts = {
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

export function getAlgod() {
  return new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_ADDRESS, '');
}

const te = new TextEncoder();
const strArg = (s) => te.encode(s);
const uintArg = (n) => algosdk.encodeUint64(Number(n));

export async function buildNoopAppCall({ from, appId, appArgs, boxes, foreignApps, foreignAssets }) {
  const algod = getAlgod();
  const sp = await algod.getTransactionParams().do();
  return algosdk.makeApplicationNoOpTxnFromObject({
    from,
    suggestedParams: sp,
    appIndex: appId,
    appArgs,
    boxes,
    foreignApps,
    foreignAssets,
  });
}

// Sponsor group helper (paymaster + target), server can build tx0, client tx1
export async function buildSponsoredGroup({ sponsor, user, paymasterAppId, targetAppId, targetArgs, targetBoxes }) {
  const algod = getAlgod();
  const sp = await algod.getTransactionParams().do();

  // Box name = b"wl_" + Itob(targetAppId)
  const name = new Uint8Array([...te.encode('wl_'), ...algosdk.encodeUint64(Number(targetAppId))]);

  const tx0 = algosdk.makeApplicationNoOpTxnFromObject({
    from: sponsor,
    appIndex: paymasterAppId,
    appArgs: [strArg('sponsor')],
    suggestedParams: { ...sp, flatFee: true, fee: 3000 },
    foreignApps: [targetAppId],
    boxes: [{ appIndex: paymasterAppId, name }],
  });

  const tx1 = algosdk.makeApplicationNoOpTxnFromObject({
    from: user,
    appIndex: targetAppId,
    appArgs: targetArgs,
    suggestedParams: { ...sp, flatFee: true, fee: 0 },
    boxes: targetBoxes,
  });

  algosdk.assignGroupID([tx0, tx1]);
  return { tx0, tx1 };
}

/* --------------------------- Module: Organization --------------------------- */

export const Organization = {
  async registerOrg(sender, name, type, country, website) {
    return buildNoopAppCall({ from: sender, appId: Contracts.organization_registry.app_id, appArgs: [strArg('register_org'), strArg(name), strArg(type), strArg(country), strArg(website)] });
  },
  async verifyOrg(sender, orgAddress) {
    return buildNoopAppCall({ from: sender, appId: Contracts.organization_registry.app_id, appArgs: [strArg('verify_org'), strArg(orgAddress)] });
  },
  async addAccreditation(sender, orgAddress, accreditationType) {
    return buildNoopAppCall({ from: sender, appId: Contracts.organization_registry.app_id, appArgs: [strArg('add_accreditation'), strArg(orgAddress), uintArg(accreditationType)] });
  },
  async updateOrgStatus(sender, orgAddress, newStatus) {
    return buildNoopAppCall({ from: sender, appId: Contracts.organization_registry.app_id, appArgs: [strArg('update_org_status'), strArg(orgAddress), uintArg(newStatus)] });
  },
  async getOrgInfo(sender, orgAddress) {
    return buildNoopAppCall({ from: sender, appId: Contracts.organization_registry.app_id, appArgs: [strArg('get_org_info'), strArg(orgAddress)] });
  },
};

/* ------------------------------ Module: User ------------------------------ */

export const UserIdentity = {
  async registerUser(sender, email, phone) {
    return buildNoopAppCall({ from: sender, appId: Contracts.user_identity.app_id, appArgs: [strArg('register_user'), strArg(email), strArg(phone)] });
  },
  async addVerification(sender, targetUser, verificationType, verifierId, verificationData) {
    return buildNoopAppCall({ from: sender, appId: Contracts.user_identity.app_id, appArgs: [strArg('add_verification'), strArg(targetUser), uintArg(verificationType), uintArg(verifierId), strArg(verificationData)], boxes: [{ name: te.encode('user_' + targetUser) }] });
  },
  async getUserProfile(sender, targetUser) {
    return buildNoopAppCall({ from: sender, appId: Contracts.user_identity.app_id, appArgs: [strArg('get_user_profile'), strArg(targetUser)] });
  },
  async addVerifier(sender, verifierId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.user_identity.app_id, appArgs: [strArg('add_verifier'), uintArg(verifierId)] });
  },
  async revokeVerification(sender, targetUser, verificationType) {
    return buildNoopAppCall({ from: sender, appId: Contracts.user_identity.app_id, appArgs: [strArg('revoke_verification'), strArg(targetUser), uintArg(verificationType)] });
  },
};

/* ------------------------- Module: Certificates --------------------------- */

export const Certificates = {
  async issueCertificate(sender, recipientAddr, certType, certName, courseDetails, gradeInfo, issueDateUnix, expiryDateUnix) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('issue_cert'), strArg(recipientAddr), strArg(certType), strArg(certName), strArg(courseDetails), strArg(gradeInfo), uintArg(issueDateUnix), uintArg(expiryDateUnix)] });
  },
  async verifyCertificate(sender, certId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('verify_cert'), uintArg(certId)] });
  },
  async revokeCertificate(sender, certId, reason) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('revoke_cert'), uintArg(certId), strArg(reason)] });
  },
  async transferCertificate(sender, certId, newOwner) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('transfer_cert'), uintArg(certId), strArg(newOwner)] });
  },
  async batchIssue(sender, batchSize, template) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('batch_issue'), uintArg(batchSize), strArg(template)] });
  },
  async getCertificate(sender, certId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('get_cert'), uintArg(certId)] });
  },
  async getUserCertificates(sender, userAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.certificate_management.app_id, appArgs: [strArg('get_user_certs'), strArg(userAddr)] });
  },
};

/* --------------------------- Module: Badges ------------------------------- */

export const Badges = {
  async createTemplate(sender, name, type, description, criteria, iconUrl) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('create_template'), strArg(name), uintArg(type), strArg(description), strArg(criteria), strArg(iconUrl)] });
  },
  async issueBadge(sender, recipient, templateId, evidence, metadata) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('issue_badge'), strArg(recipient), uintArg(templateId), strArg(evidence), strArg(metadata)] });
  },
  async nominateBadge(sender, nominee, templateId, reason) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('nominate_badge'), strArg(nominee), uintArg(templateId), strArg(reason)] });
  },
  async voteNomination(sender, nominationId, vote) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('vote_nomination'), uintArg(nominationId), uintArg(vote)] });
  },
  async stackBadges(sender, count, name) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('stack_badges'), uintArg(count), strArg(name)] });
  },
  async getBadge(sender, badgeId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('get_badge'), uintArg(badgeId)] });
  },
  async getUserBadges(sender, userAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('get_user_badges'), strArg(userAddr)] });
  },
  async revokeBadge(sender, badgeId, reason) {
    return buildNoopAppCall({ from: sender, appId: Contracts.badge_system.app_id, appArgs: [strArg('revoke_badge'), uintArg(badgeId), strArg(reason)] });
  },
};

/* -------------------------- Module: Trust Score --------------------------- */

export const TrustScore = {
  async initScore(sender, userAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('init_score'), strArg(userAddr)] });
  },
  async updateScore(sender, userAddr, verificationLevel, verificationsCount, totalCertificates, highTrustCerts, avgOrgTrust, badgesEarned, endorsementsReceived) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('update_score'), strArg(userAddr), uintArg(verificationLevel), uintArg(verificationsCount), uintArg(totalCertificates), uintArg(highTrustCerts), uintArg(avgOrgTrust), uintArg(badgesEarned), uintArg(endorsementsReceived)] });
  },
  async getScore(sender, userAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('get_score'), strArg(userAddr)] });
  },
  async addEndorsement(sender, endorseeAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.trust_score.app_id, appArgs: [strArg('add_endorsement'), strArg(endorseeAddr)] });
  },
};

/* --------------------------- Module: Smart Wallet -------------------------- */

export const SmartWallet = {
  async createWallet(sender, guardianCount, threshold, dailyLimitMicroAlgos) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('create_wallet'), uintArg(guardianCount), uintArg(threshold), uintArg(dailyLimitMicroAlgos)] });
  },
  async addGuardian(sender, guardianAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('add_guardian'), strArg(guardianAddr)] });
  },
  async removeGuardian(sender, guardianAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('remove_guardian'), strArg(guardianAddr)] });
  },
  async initiateRecovery(sender, walletOwner, newOwnerCandidate) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('initiate_recovery'), strArg(walletOwner), strArg(newOwnerCandidate)] });
  },
  async confirmRecovery(sender, walletOwner) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('confirm_recovery'), strArg(walletOwner)] });
  },
  async executeRecovery(sender, walletOwner) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('execute_recovery'), strArg(walletOwner)] });
  },
  async executePayment(sender, recipient, amountMicroAlgos) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('execute_tx'), strArg(recipient), uintArg(amountMicroAlgos)] });
  },
  async setDailyLimit(sender, newLimitMicroAlgos) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('set_daily_limit'), uintArg(newLimitMicroAlgos)] });
  },
  async getWalletInfo(sender, walletAddr) {
    return buildNoopAppCall({ from: sender, appId: Contracts.smart_wallet.app_id, appArgs: [strArg('get_wallet_info'), strArg(walletAddr)] });
  },
};

/* --------------------------- Module: Governance --------------------------- */

export const Governance = {
  async createProposal(sender, proposalType, title, description, executionData, votingDurationSecs) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('create_proposal'), uintArg(proposalType), strArg(title), strArg(description), strArg(executionData), uintArg(votingDurationSecs)] });
  },
  async voteProposal(sender, proposalId, vote, voterTrustScore, voterStakeMicroAlgos) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('vote_proposal'), uintArg(proposalId), uintArg(vote), uintArg(voterTrustScore), uintArg(voterStakeMicroAlgos)] });
  },
  async executeProposal(sender, proposalId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('execute_proposal'), uintArg(proposalId)] });
  },
  async getProposal(sender, proposalId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('get_proposal'), uintArg(proposalId)] });
  },
  async getResults(sender, proposalId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('get_results'), uintArg(proposalId)] });
  },
  async delegateVote(sender, delegateTo, proposalId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('delegate_vote'), strArg(delegateTo), uintArg(proposalId)] });
  },
  async updateParams(sender, name, value) {
    return buildNoopAppCall({ from: sender, appId: Contracts.governance.app_id, appArgs: [strArg('update_params'), strArg(name), uintArg(value)] });
  },
};

/* ----------------------- Module: Dispute Resolution ----------------------- */

export const Disputes = {
  async fileDispute(sender, disputeType, defendantAddr, subjectId, description, evidence, requestedRemedy) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('file_dispute'), uintArg(disputeType), strArg(defendantAddr), uintArg(subjectId), strArg(description), strArg(evidence), strArg(requestedRemedy)] });
  },
  async selectJury(sender, disputeId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('select_jury'), uintArg(disputeId)] });
  },
  async submitEvidence(sender, disputeId, evidenceType, evidenceData) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('submit_evidence'), uintArg(disputeId), strArg(evidenceType), strArg(evidenceData)] });
  },
  async castVote(sender, disputeId, vote, reasoning) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('cast_vote'), uintArg(disputeId), uintArg(vote), strArg(reasoning)] });
  },
  async executeVerdict(sender, disputeId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('execute_verdict'), uintArg(disputeId)] });
  },
  async getDispute(sender, disputeId) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('get_dispute'), uintArg(disputeId)] });
  },
  async joinJuryPool(sender, trustScore, stakeAmountMicroAlgos) {
    return buildNoopAppCall({ from: sender, appId: Contracts.dispute_resolution.app_id, appArgs: [strArg('join_jury_pool'), uintArg(trustScore), uintArg(stakeAmountMicroAlgos)] });
  },
};


