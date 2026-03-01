import { PublicKey } from '@solana/web3.js';

export interface UserRole {
  isFreelancer: boolean;
  isClient: boolean;
  primary: 'freelancer' | 'client' | 'both' | 'new';
  hasReputation: boolean;
  jobsPosted: number;
  bidsSubmitted: number;
  jobsCompleted: number;
}

export interface Job {
  account: {
    client: PublicKey;
    selectedFreelancer?: PublicKey | null;
  };
  publicKey: PublicKey;
}

export interface Bid {
  account: {
    freelancer: PublicKey;
    job: PublicKey;
  };
  publicKey: PublicKey;
}

export interface Reputation {
  user: PublicKey;
  totalReviews: number;
  averageRating: number;
  completedJobs: number;
  totalEarned?: any;
}

/**
 * Detect user role based on their on-chain activity
 *
 * Detection logic:
 * 1. Has reputation account → Definitely a freelancer
 * 2. Posted jobs but no bids → Client only
 * 3. Has submitted bids → Freelancer (may also be client)
 * 4. No activity → New user
 */
export function detectUserRole(
  walletAddress: PublicKey | null,
  jobs: Job[] = [],
  bids: Bid[] = [],
  reputation?: Reputation | null
): UserRole {
  if (!walletAddress) {
    return {
      isFreelancer: false,
      isClient: false,
      primary: 'new',
      hasReputation: false,
      jobsPosted: 0,
      bidsSubmitted: 0,
      jobsCompleted: 0,
    };
  }

  const walletStr = walletAddress.toBase58();

  // Count activities
  const jobsPosted = jobs.filter(
    (job) => job.account.client.toBase58() === walletStr
  ).length;

  const bidsSubmitted = bids.filter(
    (bid) => bid.account.freelancer.toBase58() === walletStr
  ).length;

  const jobsCompleted = reputation?.completedJobs || 0;
  const hasReputation = !!reputation && reputation.totalReviews > 0;

  // Detection logic
  let isFreelancer = false;
  let isClient = false;
  let primary: 'freelancer' | 'client' | 'both' | 'new' = 'new';

  // Check 1: Has reputation → Definitely freelancer
  if (hasReputation || reputation) {
    isFreelancer = true;
  }

  // Check 2: Has submitted bids → Freelancer
  if (bidsSubmitted > 0) {
    isFreelancer = true;
  }

  // Check 3: Posted jobs → Client
  if (jobsPosted > 0) {
    isClient = true;
  }

  // Check 4: Completed jobs as freelancer → Freelancer
  if (jobsCompleted > 0) {
    isFreelancer = true;
  }

  // Determine primary role
  if (isFreelancer && isClient) {
    // Determine which role is more active
    if (bidsSubmitted >= jobsPosted) {
      primary = 'freelancer';
    } else {
      primary = 'client';
    }
  } else if (isFreelancer) {
    primary = 'freelancer';
  } else if (isClient) {
    primary = 'client';
  } else {
    primary = 'new';
  }

  return {
    isFreelancer,
    isClient,
    primary,
    hasReputation,
    jobsPosted,
    bidsSubmitted,
    jobsCompleted,
  };
}

/**
 * Check if a wallet should appear in "Find Talent" page
 */
export function isFreelancerProfile(
  walletAddress: PublicKey,
  jobs: Job[] = [],
  bids: Bid[] = [],
  reputation?: Reputation | null
): boolean {
  const role = detectUserRole(walletAddress, jobs, bids, reputation);

  // Show in Find Talent if:
  // 1. Has reputation account, OR
  // 2. Has submitted at least 1 bid, OR
  // 3. Has completed jobs
  return role.isFreelancer;
}

/**
 * Get role display text
 */
export function getRoleDisplayText(role: UserRole): string {
  if (role.primary === 'both') {
    return 'Client & Freelancer';
  }
  if (role.primary === 'freelancer') {
    return 'Freelancer';
  }
  if (role.primary === 'client') {
    return 'Client';
  }
  return 'New User';
}

/**
 * Get role color for badges
 */
export function getRoleColor(role: UserRole): 'primary' | 'secondary' | 'info' | 'default' {
  if (role.primary === 'both') return 'info';
  if (role.primary === 'freelancer') return 'primary';
  if (role.primary === 'client') return 'secondary';
  return 'default';
}

/**
 * Get experience level based on completed jobs
 */
export function getExperienceLevel(jobsCompleted: number): {
  level: 'beginner' | 'intermediate' | 'experienced' | 'expert';
  label: string;
  color: 'default' | 'info' | 'primary' | 'success';
} {
  if (jobsCompleted >= 20) {
    return { level: 'expert', label: 'Expert', color: 'success' };
  }
  if (jobsCompleted >= 10) {
    return { level: 'experienced', label: 'Experienced', color: 'primary' };
  }
  if (jobsCompleted >= 3) {
    return { level: 'intermediate', label: 'Intermediate', color: 'info' };
  }
  return { level: 'beginner', label: 'Beginner', color: 'default' };
}
