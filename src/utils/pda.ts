import { web3 } from "@coral-xyz/anchor";
import { PROGRAM_ID, SEEDS } from "../config/solana";
import type { PublicKey as PublicKeyType } from "../types/solana";

// Use PublicKey from Anchor to ensure same class instance
const { PublicKey } = web3;

/**
 * Derive Job PDA
 * @param client - Client's public key
 * @param jobId - Unique job identifier (timestamp)
 */
export function deriveJobPDA(client: PublicKeyType, jobId: number): [PublicKeyType, number] {
  // Use timestamp as 8-byte buffer to avoid seed length issues
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(jobId));

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.JOB),
      client.toBuffer(),
      idBuffer,
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Bid PDA
 * @param job - Job PDA
 * @param freelancer - Freelancer's public key
 */
export function deriveBidPDA(job: PublicKeyType, freelancer: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.BID),
      job.toBuffer(),
      freelancer.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Escrow PDA
 * @param job - Job PDA
 */
export function deriveEscrowPDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.ESCROW),
      job.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Work Submission PDA
 * @param job - Job PDA
 */
export function deriveWorkSubmissionPDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.WORK),
      job.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Dispute PDA
 * @param job - Job PDA
 */
export function deriveDisputePDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.DISPUTE),
      job.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Vote Record PDA
 * @param dispute - Dispute PDA
 * @param voter - Voter's public key
 */
export function deriveVoteRecordPDA(dispute: PublicKeyType, voter: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.VOTE),
      dispute.toBuffer(),
      voter.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Reputation PDA
 * @param user - User's public key
 */
export function deriveReputationPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.REPUTATION),
      user.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive Review PDA
 * @param job - Job PDA
 * @param reviewer - Reviewer's public key
 */
export function deriveReviewPDA(job: PublicKeyType, reviewer: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEEDS.REVIEW),
      job.toBuffer(),
      reviewer.toBuffer(),
    ],
    PROGRAM_ID
  );
}

// ==================== MILESTONE PDAs ====================

/**
 * Derive Job Milestone Config PDA
 * @param job - Job PDA
 */
export function deriveJobMilestoneConfigPDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.JOB_CONFIG), job.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Milestone PDA
 * @param job - Job PDA
 * @param milestoneIndex - Milestone index (0-9)
 */
export function deriveMilestonePDA(job: PublicKeyType, milestoneIndex: number): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MILESTONE), job.toBuffer(), Buffer.from([milestoneIndex])],
    PROGRAM_ID
  );
}

/**
 * Derive Milestone Escrow PDA
 * @param milestone - Milestone PDA
 */
export function deriveMilestoneEscrowPDA(milestone: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MS_ESCROW), milestone.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Milestone Dispute PDA
 * @param milestone - Milestone PDA
 */
export function deriveMilestoneDisputePDA(milestone: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.MS_DISPUTE), milestone.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== SBT REPUTATION PDAs ====================

/**
 * Derive SBT Counter PDA
 * @param user - User's public key
 */
export function deriveSBTCounterPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SBT_COUNTER), user.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Reputation SBT PDA
 * @param user - User's public key
 * @param index - SBT index (sequential)
 */
export function deriveSBTPDA(user: PublicKeyType, index: number): [PublicKeyType, number] {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SBT), user.toBuffer(), indexBuffer],
    PROGRAM_ID
  );
}

// ==================== STAKING DISPUTE PDAs ====================

/**
 * Derive Dispute Config PDA (singleton)
 */
export function deriveDisputeConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.DISPUTE_CONFIG)],
    PROGRAM_ID
  );
}

/**
 * Derive Juror Registry PDA (singleton)
 */
export function deriveJurorRegistryPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.JUROR_REGISTRY)],
    PROGRAM_ID
  );
}

/**
 * Derive Juror Stake PDA
 * @param juror - Juror's public key
 */
export function deriveJurorStakePDA(juror: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.JUROR_STAKE), juror.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Juror Selection PDA
 * @param dispute - Dispute PDA
 */
export function deriveJurorSelectionPDA(dispute: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.JUROR_SELECTION), dispute.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive Staked Vote Record PDA
 * @param dispute - Dispute PDA
 * @param juror - Juror's public key
 */
export function deriveStakedVotePDA(dispute: PublicKeyType, juror: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.STAKED_VOTE), dispute.toBuffer(), juror.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== GOVERNANCE TOKEN PDAs ====================

export function derivePlatformConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PLATFORM_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveTokenStakePDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.TOKEN_STAKE), user.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveStakeVaultPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.STAKE_VAULT)],
    PROGRAM_ID
  );
}

export function deriveQualityStakePDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.QUALITY_STAKE), job.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveQualityVaultPDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.QUALITY_VAULT), job.toBuffer()],
    PROGRAM_ID
  );
}

export function derivePlatformTreasuryPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PLATFORM_TREASURY)],
    PROGRAM_ID
  );
}

// ==================== REFERRAL PDAs ====================

export function deriveReferralConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.REFERRAL_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveReferralAccountPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.REFERRAL), user.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveReferralPayoutPDA(job: PublicKeyType, referrer: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.REFERRAL_PAYOUT), job.toBuffer(), referrer.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== DID PDAs ====================

export function deriveDIDDocumentPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.DID), user.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveVCAnchorPDA(issuer: PublicKeyType, index: number): [PublicKeyType, number] {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VC_ANCHOR), issuer.toBuffer(), indexBuffer],
    PROGRAM_ID
  );
}

export function deriveVCCounterPDA(issuer: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.VC_COUNTER), issuer.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== SYBIL RESISTANCE PDAs ====================

export function deriveSybilConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SYBIL_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveIdentityStampsPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.IDENTITY_STAMPS), user.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== DAO GOVERNANCE PDAs ====================

export function deriveDAOConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.DAO_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveProposalPDA(proposalId: number): [PublicKeyType, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(proposalId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.PROPOSAL), idBuffer],
    PROGRAM_ID
  );
}

export function deriveDAOVotePDA(proposal: PublicKeyType, voter: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.DAO_VOTE), proposal.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveDAOTreasuryPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.DAO_TREASURY)],
    PROGRAM_ID
  );
}

// ==================== ACCOUNT ABSTRACTION PDAs ====================

export function deriveSessionKeyPDA(owner: PublicKeyType, sessionKey: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.SESSION_KEY), owner.toBuffer(), sessionKey.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveFeePayerConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.FEE_PAYER_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveUserSessionCounterPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.USER_SESSION_COUNTER), user.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveGasUsagePDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.GAS_USAGE), user.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== SOCIAL RECOVERY PDAs ====================

export function deriveRecoveryConfigPDA(owner: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.RECOVERY_CONFIG), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveRecoveryRequestPDA(owner: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.RECOVERY_REQUEST), owner.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== AI ORACLE PDAs ====================

export function deriveAIOracleConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.AI_ORACLE_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveAIVerificationPDA(job: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.AI_VERIFICATION), job.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== ZK PROOFS PDAs ====================

export function deriveZKVerifierConfigPDA(): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.ZK_VERIFIER_CONFIG)],
    PROGRAM_ID
  );
}

export function deriveZKCredentialPDA(user: PublicKeyType, index: number): [PublicKeyType, number] {
  const indexBuffer = Buffer.alloc(4);
  indexBuffer.writeUInt32LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.ZK_CREDENTIAL), user.toBuffer(), indexBuffer],
    PROGRAM_ID
  );
}

export function deriveZKCounterPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.ZK_COUNTER), user.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== KYC PDAs ====================

/**
 * Derive KYC Record PDA
 * @param user - User's public key
 */
export function deriveKycPDA(user: PublicKeyType): [PublicKeyType, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.KYC), user.toBuffer()],
    PROGRAM_ID
  );
}
