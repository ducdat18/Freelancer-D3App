import type { Address } from 'viem'
import type { JobStatus } from '../config/constants'

// Job Types
export interface Job {
  id: bigint
  title: string
  description: string
  budget: bigint
  deadline: bigint
  client: Address
  freelancer?: Address
  status: JobStatus
  createdAt: bigint
  completedAt?: bigint
  ipfsHash: string
}

export interface JobMetadata {
  title: string
  description: string
  category: string
  skills: string[]
  attachments?: string[]
  notes?: string
  isPrivate?: boolean
  invitedFreelancer?: string
}

export interface CreateJobParams {
  title: string
  description: string
  budget: bigint
  deadline: bigint
  ipfsHash: string
}

export interface JobFilters {
  status?: JobStatus
  minBudget?: bigint
  maxBudget?: bigint
  category?: string
  searchTerm?: string
  client?: Address
  freelancer?: Address
}

// Proposal Types
export interface Proposal {
  id: bigint
  jobId: bigint
  freelancer: Address
  coverLetter: string
  proposedBudget: bigint
  estimatedDuration: bigint
  ipfsHash: string
  createdAt: bigint
  status: ProposalStatus
}

export enum ProposalStatus {
  PENDING = 0,
  ACCEPTED = 1,
  REJECTED = 2,
  WITHDRAWN = 3,
}

// Escrow Types
export interface Escrow {
  jobId: bigint
  client: Address
  freelancer: Address
  amount: bigint
  releaseTime: bigint
  isReleased: boolean
  isDisputed: boolean
}

// Reputation Types
export interface UserReputation {
  address: Address
  totalJobs: number
  completedJobs: number
  cancelledJobs: number
  averageRating: number
  totalEarned: bigint
  totalSpent: bigint
}

export interface Rating {
  jobId: bigint
  from: Address
  to: Address
  rating: number
  comment: string
  createdAt: bigint
}

// User Profile Types
export interface UserProfile {
  address: Address
  name?: string
  bio?: string
  avatarUrl?: string
  skills?: string[]
  hourlyRate?: bigint
  reputation: UserReputation
  isFreelancer: boolean
  isClient: boolean
}

// Transaction Types
export interface Transaction {
  hash: string
  from: Address
  to: Address
  value: bigint
  timestamp: number
  status: 'pending' | 'success' | 'failed'
}

// Notification Types
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: number
  link?: string
}

export enum NotificationType {
  JOB_CREATED = 'job_created',
  PROPOSAL_RECEIVED = 'proposal_received',
  PROPOSAL_ACCEPTED = 'proposal_accepted',
  JOB_STARTED = 'job_started',
  JOB_COMPLETED = 'job_completed',
  PAYMENT_RECEIVED = 'payment_received',
  DISPUTE_RAISED = 'dispute_raised',
  RATING_RECEIVED = 'rating_received',
}

// Pagination Types
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ==================== GOVERNANCE TOKEN TYPES ====================

export interface PlatformConfig {
  admin: string
  tokenMint: string
  treasury: string
  totalStaked: number
  feePercentage: number
  buybackPercentage: number
  accumulatedFees: number
  totalFeesCollected: number
  totalBurned: number
  lastDistribution: number
}

export interface TokenStakeData {
  user: string
  amount: number
  stakedAt: number
  lastClaimed: number
  lockUntil: number
  accumulatedRewards: number
}

export interface QualityStakeData {
  job: string
  staker: string
  amount: number
  stakedAt: number
  released: boolean
  slashed: boolean
}

// ==================== REFERRAL TYPES ====================

export interface ReferralConfig {
  admin: string
  level1Percentage: number
  level2Percentage: number
  maxLevels: number
  totalReferrals: number
  totalCommissionsPaid: number
  active: boolean
}

export interface ReferralAccountData {
  user: string
  referrer: string | null
  referralCount: number
  totalEarnings: number
  registeredAt: number
}

export interface ReferralPayoutData {
  job: string
  referrer: string
  referredUser: string
  amount: number
  level: number
  paid: boolean
  paidAt: number | null
}

// ==================== DID TYPES ====================

export interface DIDDocumentData {
  owner: string
  didUri: string
  verificationMethodCount: number
  vmTypes: number[]
  vmKeys: Uint8Array[]
  vmControllers: string[]
  serviceEndpointCount: number
  seTypes: number[]
  seUris: string[]
  seVerified: boolean[]
  createdAt: number
  updatedAt: number
  active: boolean
}

export interface VCAnchorData {
  issuer: string
  subject: string
  credentialHash: Uint8Array
  credentialType: string
  metadataUri: string
  issuedAt: number
  expiresAt: number | null
  revoked: boolean
  vcIndex: number
}

export enum VerificationMethodType {
  Ed25519 = 0,
  EcdsaSecp256k1 = 1,
  JsonWebKey = 2,
  X25519 = 3,
}

export enum ServiceType {
  LinkedIn = 0,
  GitHub = 1,
  Twitter = 2,
  Website = 3,
  Email = 4,
  Portfolio = 5,
  Telegram = 6,
  Discord = 7,
  Medium = 8,
  Other = 9,
}

// ==================== SYBIL RESISTANCE TYPES ====================

export interface SybilConfigData {
  admin: string
  oracleAuthority: string
  minScoreToBid: number
  minScoreToPost: number
  active: boolean
  totalVerifiedUsers: number
}

export interface IdentityStampsData {
  user: string
  stampCount: number
  stampTypes: number[]
  stampWeights: number[]
  humanityScore: number
  thresholdReached: boolean
  lastUpdated: number
}

export enum StampType {
  PhoneVerified = 0,
  EmailVerified = 1,
  GitHubConnected = 2,
  LinkedInConnected = 3,
  TwitterConnected = 4,
  GovernmentId = 5,
  BiometricVerified = 6,
  ExistingReputation = 7,
  StakingActive = 8,
  ReferralVerified = 9,
}

export const StampTypeLabels: Record<StampType, string> = {
  [StampType.PhoneVerified]: 'Phone Verified',
  [StampType.EmailVerified]: 'Email Verified',
  [StampType.GitHubConnected]: 'GitHub Connected',
  [StampType.LinkedInConnected]: 'LinkedIn Connected',
  [StampType.TwitterConnected]: 'Twitter Connected',
  [StampType.GovernmentId]: 'Government ID',
  [StampType.BiometricVerified]: 'Biometric Verified',
  [StampType.ExistingReputation]: 'On-chain Reputation',
  [StampType.StakingActive]: 'Active Staker',
  [StampType.ReferralVerified]: 'Referral Verified',
}

// ==================== DAO GOVERNANCE TYPES ====================

export interface DAOConfigData {
  admin: string
  tokenMint: string
  proposalCount: number
  minProposalStake: number
  votingPeriod: number
  quorumPercentage: number
  reputationMultiplier: number
  totalProposalsExecuted: number
}

export interface ProposalData {
  id: number
  proposer: string
  title: string
  descriptionUri: string
  proposalType: number
  status: number
  votesFor: number
  votesAgainst: number
  totalVoters: number
  stakeAmount: number
  createdAt: number
  votingEndsAt: number
  executed: boolean
}

export interface DAOVoteData {
  proposal: string
  voter: string
  voteWeight: number
  voteFor: boolean
  tokenAmount: number
  sbtCount: number
  votedAt: number
}

export enum GovernanceProposalType {
  ParameterChange = 0,
  TreasurySpend = 1,
  FeatureToggle = 2,
  ArbitratorElection = 3,
  EmergencyAction = 4,
}

export enum GovernanceProposalStatus {
  Active = 0,
  Approved = 1,
  Rejected = 2,
  Executed = 3,
  QuorumNotMet = 4,
  Cancelled = 5,
}

// ==================== ACCOUNT ABSTRACTION TYPES ====================

export interface SessionKeyData {
  owner: string
  sessionPubkey: string
  validUntil: number
  maxAmount: number
  spentAmount: number
  allowedActions: number
  active: boolean
  createdAt: number
  txCount: number
}

export interface FeePayerConfigData {
  admin: string
  feePayer: string
  dailyBudget: number
  spentToday: number
  lastReset: number
  maxTxPerUserPerDay: number
  totalSponsored: number
  active: boolean
}

// Action bitmask constants
export const SessionActions = {
  CREATE_JOB: 1 << 0,
  SUBMIT_BID: 1 << 1,
  SUBMIT_WORK: 1 << 2,
  APPROVE_WORK: 1 << 3,
  SEND_MESSAGE: 1 << 4,
  UPDATE_PROFILE: 1 << 5,
  MILESTONE_OPS: 1 << 6,
  DISPUTE_OPS: 1 << 7,
} as const

// ==================== SOCIAL RECOVERY TYPES ====================

export interface RecoveryConfigData {
  owner: string
  guardians: string[]
  threshold: number
  timelockPeriod: number
  active: boolean
  createdAt: number
  updatedAt: number
}

export interface RecoveryRequestData {
  owner: string
  newOwner: string
  initiatedBy: string
  approvals: string[]
  initiatedAt: number
  executableAt: number
  executed: boolean
  cancelled: boolean
}

// ==================== AI ORACLE TYPES ====================

export interface AIOracleConfigData {
  admin: string
  oracleAuthorities: string[]
  minConfidence: number
  minOracleConsensus: number
  totalVerifications: number
  active: boolean
}

export interface AIVerificationResultData {
  job: string
  verificationType: number
  oracleCount: number
  oracleScores: number[]
  oracleConfidences: number[]
  finalScore: number
  finalConfidence: number
  consensusReached: boolean
  autoApproved: boolean
  resultUri: string
  disputed: boolean
  disputeReason: string
  humanReviewed: boolean
  resolutionUri: string
}

export enum AIVerificationType {
  CodeQuality = 0,
  DesignReview = 1,
  ContentModeration = 2,
  PlagiarismCheck = 3,
  SecurityAudit = 4,
  PerformanceTest = 5,
}

// ==================== ZK PROOFS TYPES ====================

export interface ZKCredentialData {
  user: string
  credentialType: string
  commitment: Uint8Array
  proofHash: Uint8Array
  publicInputsHash: Uint8Array
  verifier: string
  submittedAt: number
  verifiedAt: number | null
  validUntil: number | null
  verified: boolean
  revoked: boolean
  credentialIndex: number
}
