export enum AchievementType {
  FirstJob = 0,
  TenJobs = 1,
  FiftyJobs = 2,
  HundredJobs = 3,
  TopRated = 4,
  HighEarner = 5,
  TrustedArbitrator = 6,
}

export interface UserReputation {
  completedJobs: number;
  totalReviews: number;
  averageRating: number;
  totalEarned: number;
}

export interface Achievement {
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
  checkEligibility: (reputation: UserReputation) => boolean;
  symbol: string; // NFT symbol
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    type: AchievementType.FirstJob,
    name: 'First Job Completed',
    description: 'Complete your first job successfully and earn your place in the marketplace',
    icon: '🎯',
    color: '#4CAF50',
    requirement: 'Complete 1 job',
    symbol: 'FIRST',
    checkEligibility: (rep) => rep.completedJobs >= 1
  },
  {
    type: AchievementType.TenJobs,
    name: 'Dedicated Worker',
    description: 'Successfully complete 10 jobs and prove your dedication',
    icon: '⭐',
    color: '#2196F3',
    requirement: 'Complete 10 jobs',
    symbol: 'TEN',
    checkEligibility: (rep) => rep.completedJobs >= 10
  },
  {
    type: AchievementType.FiftyJobs,
    name: 'Veteran Freelancer',
    description: 'A true professional with 50 completed jobs under your belt',
    icon: '🏆',
    color: '#FF9800',
    requirement: 'Complete 50 jobs',
    symbol: 'FIFTY',
    checkEligibility: (rep) => rep.completedJobs >= 50
  },
  {
    type: AchievementType.HundredJobs,
    name: 'Century Master',
    description: 'An elite freelancer who has completed 100 jobs',
    icon: '👑',
    color: '#9C27B0',
    requirement: 'Complete 100 jobs',
    symbol: 'HUNDRED',
    checkEligibility: (rep) => rep.completedJobs >= 100
  },
  {
    type: AchievementType.TopRated,
    name: 'Top Rated',
    description: 'Maintain excellence with a 4.8+ rating and 20+ reviews',
    icon: '💎',
    color: '#00BCD4',
    requirement: '4.8+ rating with 20+ reviews',
    symbol: 'TOPRATED',
    checkEligibility: (rep) => rep.averageRating >= 4.8 && rep.totalReviews >= 20
  },
  {
    type: AchievementType.HighEarner,
    name: 'High Earner',
    description: 'Earn over 10 SOL through quality work',
    icon: '💰',
    color: '#8BC34A',
    requirement: 'Earn 10+ SOL',
    symbol: 'EARNER',
    checkEligibility: (rep) => rep.totalEarned >= 10_000_000_000 // 10 SOL in lamports
  },
  {
    type: AchievementType.TrustedArbitrator,
    name: 'Trusted Arbitrator',
    description: 'Become a trusted community arbitrator with exceptional reputation',
    icon: '⚖️',
    color: '#F44336',
    requirement: '4.5+ rating with 50+ reviews',
    symbol: 'ARBITER',
    checkEligibility: (rep) => rep.averageRating >= 4.5 && rep.totalReviews >= 50
  }
];

// Helper functions
export const getAchievementByType = (type: AchievementType): Achievement | undefined => {
  return ACHIEVEMENTS.find(ach => ach.type === type);
};

export const checkAllEligibility = (reputation: UserReputation): Achievement[] => {
  return ACHIEVEMENTS.filter(ach => ach.checkEligibility(reputation));
};

export const getNextAchievement = (
  reputation: UserReputation,
  earnedAchievements: AchievementType[]
): Achievement | null => {
  // Get achievements not yet earned
  const unearned = ACHIEVEMENTS.filter(
    ach => !earnedAchievements.includes(ach.type)
  );

  // Sort by how close the user is to earning them
  // For simplicity, just return the first unearned one
  // (Could enhance this to show progress percentage)

  return unearned[0] || null;
};

// Calculate progress towards an achievement (0-100%)
export const calculateProgress = (
  achievement: Achievement,
  reputation: UserReputation
): number => {
  switch (achievement.type) {
    case AchievementType.FirstJob:
      return Math.min((reputation.completedJobs / 1) * 100, 100);

    case AchievementType.TenJobs:
      return Math.min((reputation.completedJobs / 10) * 100, 100);

    case AchievementType.FiftyJobs:
      return Math.min((reputation.completedJobs / 50) * 100, 100);

    case AchievementType.HundredJobs:
      return Math.min((reputation.completedJobs / 100) * 100, 100);

    case AchievementType.TopRated:
      if (reputation.totalReviews < 20) {
        return (reputation.totalReviews / 20) * 50; // 50% when you have reviews
      }
      if (reputation.averageRating < 4.8) {
        return 50 + ((reputation.averageRating - 4.0) / 0.8) * 50;
      }
      return 100;

    case AchievementType.HighEarner:
      const earnedSOL = reputation.totalEarned / 1_000_000_000;
      return Math.min((earnedSOL / 10) * 100, 100);

    case AchievementType.TrustedArbitrator:
      if (reputation.totalReviews < 50) {
        return (reputation.totalReviews / 50) * 50;
      }
      if (reputation.averageRating < 4.5) {
        return 50 + ((reputation.averageRating - 4.0) / 0.5) * 50;
      }
      return 100;

    default:
      return 0;
  }
};
