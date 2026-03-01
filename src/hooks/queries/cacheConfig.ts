/**
 * Smart Cache Configuration
 *
 * Per-domain cache timing based on data volatility.
 * More volatile data (balance, active disputes) → shorter staleTime
 * Immutable data (SBTs, dispute config) → longer staleTime
 */

export interface CacheConfig {
  staleTime: number;
  gcTime: number;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Balance: changes with every transaction
 */
export const balanceCacheConfig: CacheConfig = {
  staleTime: 10 * SECOND,
  gcTime: 2 * MINUTE,
  refetchInterval: 15 * SECOND,
  refetchOnWindowFocus: true,
};

/**
 * Job listings: moderate update frequency
 */
export const jobListCacheConfig: CacheConfig = {
  staleTime: 2 * MINUTE,
  gcTime: 10 * MINUTE,
  refetchOnWindowFocus: false,
};

/**
 * Job detail: status changes matter
 */
export const jobDetailCacheConfig: CacheConfig = {
  staleTime: 30 * SECOND,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: true,
};

/**
 * Escrow state: financial data, needs freshness
 */
export const escrowCacheConfig: CacheConfig = {
  staleTime: 30 * SECOND,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: true,
};

/**
 * Milestones: status updates on user actions
 */
export const milestoneCacheConfig: CacheConfig = {
  staleTime: 1 * MINUTE,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: false,
};

/**
 * SBT/Reputation: rarely changes (on-chain SBT, only on mint/revoke)
 */
export const sbtCacheConfig: CacheConfig = {
  staleTime: 30 * MINUTE,
  gcTime: 60 * MINUTE,
  refetchOnWindowFocus: false,
};

/**
 * Dispute config: admin-set, nearly static
 */
export const disputeConfigCacheConfig: CacheConfig = {
  staleTime: 60 * MINUTE,
  gcTime: 2 * HOUR,
  refetchOnWindowFocus: false,
};

/**
 * Active dispute detail: needs freshness during voting
 */
export const disputeDetailCacheConfig: CacheConfig = {
  staleTime: 30 * SECOND,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: true,
};

/**
 * Bids: competitive bidding needs freshness
 */
export const bidsCacheConfig: CacheConfig = {
  staleTime: 30 * SECOND,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: true,
};

/**
 * Juror stakes: moderate frequency
 */
export const stakeCacheConfig: CacheConfig = {
  staleTime: 1 * MINUTE,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: false,
};

/**
 * User stats: aggregated, moderate freshness
 */
export const userStatsCacheConfig: CacheConfig = {
  staleTime: 2 * MINUTE,
  gcTime: 10 * MINUTE,
  refetchOnWindowFocus: false,
};
