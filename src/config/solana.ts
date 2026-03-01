import { web3 } from "@coral-xyz/anchor";

const { PublicKey, clusterApiUrl } = web3;

// Program ID string - raw address
export const PROGRAM_ID_STRING = "FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i";

// Program ID - Updated after deployment
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

// Network configuration
export const NETWORK = "devnet";

// Use custom RPC from env or fallback to free tier RPCs
export const ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 
  "https://devnet.helius-rpc.com/?api-key=public" || // Helius free tier (better rate limits)
  "https://rpc.ankr.com/solana_devnet" || // Ankr free tier
  clusterApiUrl(NETWORK); // Fallback to public

// Optional: Custom RPC endpoints for better performance
export const RPC_ENDPOINTS = {
  devnet: [
    process.env.NEXT_PUBLIC_RPC_ENDPOINT,
    "https://devnet.helius-rpc.com/?api-key=public", // Helius public
    "https://rpc.ankr.com/solana_devnet", // Ankr
    "https://api.devnet.solana.com", // Solana Labs (rate limited)
    clusterApiUrl("devnet"), // Last resort
  ].filter(Boolean) as string[],
  mainnet: [
    "https://api.mainnet-beta.solana.com",
    clusterApiUrl("mainnet-beta"),
  ],
};

// Commitment level for transactions
export const COMMITMENT = "confirmed";

// Program constants
export const CONSTANTS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_PROPOSAL_LENGTH: 500,
  MAX_COMMENT_LENGTH: 300,
  MAX_URI_LENGTH: 200,
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_DISPUTE_VOTES: 5,
  MIN_ARBITRATOR_RATING: 4.0,
  MIN_ARBITRATOR_REVIEWS: 5,
};

// Seeds for PDAs
export const SEEDS = {
  JOB: "job",
  BID: "bid",
  ESCROW: "escrow",
  WORK: "work",
  DISPUTE: "dispute",
  VOTE: "vote",
  REPUTATION: "reputation",
  REVIEW: "review",
  // Milestone
  JOB_CONFIG: "job-config",
  MILESTONE: "milestone",
  MS_ESCROW: "ms-escrow",
  MS_DISPUTE: "ms-dispute",
  // SBT Reputation
  SBT: "sbt",
  SBT_COUNTER: "sbt-counter",
  // Staking Dispute
  DISPUTE_CONFIG: "dispute-config",
  JUROR_REGISTRY: "juror-registry",
  JUROR_STAKE: "juror-stake",
  JUROR_SELECTION: "juror-selection",
  STAKED_VOTE: "staked-vote",
  JURY_VAULT: "jury-vault",
  // Governance Token
  PLATFORM_CONFIG: "platform-config",
  TOKEN_STAKE: "token-stake",
  STAKE_VAULT: "stake-vault",
  QUALITY_STAKE: "quality-stake",
  QUALITY_VAULT: "quality-vault",
  PLATFORM_TREASURY: "platform-treasury",
  // Referral
  REFERRAL_CONFIG: "referral-config",
  REFERRAL: "referral",
  REFERRAL_PAYOUT: "referral-payout",
  // DID
  DID: "did",
  VC_ANCHOR: "vc-anchor",
  VC_COUNTER: "vc-counter",
  // Sybil Resistance
  SYBIL_CONFIG: "sybil-config",
  IDENTITY_STAMPS: "identity-stamps",
  // DAO Governance
  DAO_CONFIG: "dao-config",
  PROPOSAL: "proposal",
  DAO_VOTE: "dao-vote",
  DAO_TREASURY: "dao-treasury",
  // Account Abstraction
  SESSION_KEY: "session-key",
  FEE_PAYER_CONFIG: "fee-payer-config",
  USER_SESSION_COUNTER: "user-session-counter",
  GAS_USAGE: "gas-usage",
  // Social Recovery
  RECOVERY_CONFIG: "recovery-config",
  RECOVERY_REQUEST: "recovery-request",
  // AI Oracle
  AI_ORACLE_CONFIG: "ai-oracle-config",
  AI_VERIFICATION: "ai-verification",
  // ZK Proofs
  ZK_VERIFIER_CONFIG: "zk-verifier-config",
  ZK_CREDENTIAL: "zk-credential",
  ZK_COUNTER: "zk-counter",
  // KYC Identity
  KYC: "kyc",
};
