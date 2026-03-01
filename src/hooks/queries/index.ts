/**
 * Query Hooks - Central Export
 *
 * Import all query hooks and utilities from this file:
 * import { queryKeys, useBalanceQuery, useEscrowDetailQuery } from '../hooks/queries';
 */

// Key factory
export { queryKeys } from './queryKeys';

// Cache configs
export * from './cacheConfig';

// Balance
export { useBalanceQuery } from './useBalanceQuery';

// Jobs
export { useJobsQuery, useJobQuery, useCreateJobMutation, useInvalidateJobs } from './useJobsQuery';

// Bids
export { useJobBidsQuery, useFreelancerBidsQuery, useInvalidateBids } from './useBidsQuery';

// Escrow
export {
  useEscrowDetailQuery,
  useDepositEscrowMutation,
  useSubmitWorkMutation,
  useReleaseEscrowMutation,
} from './useEscrowQuery';

// Milestones
export {
  useMilestoneConfigQuery,
  useMilestonesForJobQuery,
  useMilestoneEscrowQuery,
  useFundMilestoneMutation,
  useSubmitMilestoneWorkMutation,
  useApproveMilestoneMutation,
} from './useMilestonesQuery';

// SBT Reputation
export {
  useSBTCounterQuery,
  useUserSBTsQuery,
  useSBTDetailQuery,
  useSBTVerificationQuery,
} from './useSBTQuery';

// Staking Disputes
export {
  useDisputeConfigQuery,
  useJurorRegistryQuery,
  useJurorStakeQuery,
  useJurorSelectionQuery,
  useStakedVoteQuery,
  useIsSelectedJurorQuery,
  useStakeForJuryMutation,
  useCastStakedVoteMutation,
  useClaimStakingRewardMutation,
} from './useStakingDisputeQuery';
