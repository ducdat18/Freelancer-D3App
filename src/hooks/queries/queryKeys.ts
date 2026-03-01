/**
 * Centralized Query Key Factory
 *
 * Single source of truth for all TanStack Query keys.
 * Ensures consistent cache invalidation across the app.
 *
 * Pattern: domain.scope.params
 * - domain.all → invalidates everything in that domain
 * - domain.lists() → invalidates all lists
 * - domain.detail(id) → invalidates a specific detail
 */

export const queryKeys = {
  // ==================== JOBS ====================
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.jobs.lists(), { filters: filters || 'all' }] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (pubkey: string) => [...queryKeys.jobs.details(), pubkey] as const,
    bids: (jobPubkey: string) => [...queryKeys.jobs.all, 'bids', jobPubkey] as const,
  },

  // ==================== BIDS ====================
  bids: {
    all: ['bids'] as const,
    lists: () => [...queryKeys.bids.all, 'list'] as const,
    byJob: (jobPubkey: string) => [...queryKeys.bids.lists(), 'job', jobPubkey] as const,
    byFreelancer: (freelancerPubkey: string) =>
      [...queryKeys.bids.lists(), 'freelancer', freelancerPubkey] as const,
  },

  // ==================== BALANCE ====================
  balance: {
    all: ['balance'] as const,
    wallet: (address: string) => [...queryKeys.balance.all, address] as const,
  },

  // ==================== ESCROW ====================
  escrow: {
    all: ['escrow'] as const,
    detail: (jobPubkey: string) => [...queryKeys.escrow.all, 'detail', jobPubkey] as const,
    milestoneEscrow: (milestonePubkey: string) =>
      [...queryKeys.escrow.all, 'milestone', milestonePubkey] as const,
  },

  // ==================== MILESTONES ====================
  milestones: {
    all: ['milestones'] as const,
    config: (jobPubkey: string) => [...queryKeys.milestones.all, 'config', jobPubkey] as const,
    forJob: (jobPubkey: string) => [...queryKeys.milestones.all, 'job', jobPubkey] as const,
    detail: (jobPubkey: string, index: number) =>
      [...queryKeys.milestones.all, 'detail', jobPubkey, index] as const,
  },

  // ==================== SBT / REPUTATION ====================
  sbt: {
    all: ['sbt'] as const,
    counter: (userPubkey: string) => [...queryKeys.sbt.all, 'counter', userPubkey] as const,
    user: (userPubkey: string) => [...queryKeys.sbt.all, 'user', userPubkey] as const,
    detail: (userPubkey: string, index: number) =>
      [...queryKeys.sbt.all, 'detail', userPubkey, index] as const,
    verification: (userPubkey: string, index: number) =>
      [...queryKeys.sbt.all, 'verify', userPubkey, index] as const,
  },

  // ==================== DISPUTES ====================
  disputes: {
    all: ['disputes'] as const,
    lists: () => [...queryKeys.disputes.all, 'list'] as const,
    detail: (disputePubkey: string) => [...queryKeys.disputes.all, 'detail', disputePubkey] as const,
    config: () => [...queryKeys.disputes.all, 'config'] as const,
    registry: () => [...queryKeys.disputes.all, 'registry'] as const,
    stake: (jurorPubkey: string) => [...queryKeys.disputes.all, 'stake', jurorPubkey] as const,
    selection: (disputePubkey: string) =>
      [...queryKeys.disputes.all, 'selection', disputePubkey] as const,
    vote: (disputePubkey: string, jurorPubkey: string) =>
      [...queryKeys.disputes.all, 'vote', disputePubkey, jurorPubkey] as const,
    votes: (disputePubkey: string) =>
      [...queryKeys.disputes.all, 'votes', disputePubkey] as const,
  },

  // ==================== FREELANCERS ====================
  freelancers: {
    all: ['freelancers'] as const,
    top: (limit: number) => [...queryKeys.freelancers.all, 'top', limit] as const,
  },

  // ==================== USER STATS ====================
  userStats: {
    all: ['userStats'] as const,
    detail: (address: string) => [...queryKeys.userStats.all, address] as const,
  },
} as const;
