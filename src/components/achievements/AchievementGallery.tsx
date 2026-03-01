import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import { EmojiEvents, Lock, CheckCircle } from '@mui/icons-material';
import { ACHIEVEMENTS, calculateProgress } from '../../config/achievements';
import { useAchievements } from '../../hooks/useAchievements';
import { useReputation } from '../../hooks/useReputation';
import AchievementBadge from './AchievementBadge';
import MintAchievementDialog from './MintAchievementDialog';
import { PublicKey } from '@solana/web3.js';
import type { ReputationData } from '../../hooks/useReputation';

interface AchievementGalleryProps {
  walletAddress?: string;
  onAchievementClick?: (achievementType: number) => void;
}

export default function AchievementGallery({
  walletAddress,
  onAchievementClick
}: AchievementGalleryProps) {
  const { achievements, eligibleAchievements, earnedTypes, loading } = useAchievements(walletAddress);
  const { fetchReputation } = useReputation();
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'earned' | 'locked'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<number | null>(null);

  // Fetch reputation data when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      try {
        const pubkey = new PublicKey(walletAddress);
        fetchReputation(pubkey).then(data => setReputation(data));
      } catch (err) {
        console.error('Error fetching reputation:', err);
      }
    }
  }, [walletAddress, fetchReputation]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'all' | 'earned' | 'locked') => {
    setFilterTab(newValue);
  };

  const handleAchievementClick = (achievementType: number) => {
    if (onAchievementClick) {
      onAchievementClick(achievementType);
    }
    // Check if eligible to mint
    const isEligible = eligibleAchievements.some(ach => ach.type === achievementType);
    if (isEligible) {
      setSelectedAchievement(achievementType);
    }
  };

  // Filter achievements based on tab
  const filteredAchievements = ACHIEVEMENTS.filter(ach => {
    const isEarned = earnedTypes.includes(ach.type);

    if (filterTab === 'earned') return isEarned;
    if (filterTab === 'locked') return !isEarned;
    return true; // 'all'
  });

  // Calculate stats
  const earnedCount = earnedTypes.length;
  const totalCount = ACHIEVEMENTS.length;
  const progress = (earnedCount / totalCount) * 100;

  // Get achievement record data
  const getAchievementData = (achievementType: number) => {
    return achievements.find(ach => ach.account.achievementType === achievementType);
  };

  if (loading && achievements.length === 0) {
    return (
      <LoadingSpinner
        message="Loading achievements..."
        logs={[
          { text: 'gPA: AchievementNFT[owner = signer]...', type: 'info' },
          { text: 'Matching achievement_type to config table...', type: 'info' },
          { text: 'Unlocked criteria evaluated', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  return (
    <Box>
      {/* Header Stats */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Achievements
          </Typography>
          <Chip
            icon={<EmojiEvents />}
            label={`${earnedCount}/${totalCount}`}
            color="primary"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        {/* Progress Bar */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: 'linear-gradient(90deg, #4CAF50 0%, #2196F3 50%, #9C27B0 100%)'
              }
            }}
          />
        </Box>
      </Box>

      {/* Eligible Achievements Alert */}
      {eligibleAchievements.length > 0 && (
        <Alert
          severity="success"
          icon={<CheckCircle />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight="bold">
            🎉 You've unlocked {eligibleAchievements.length} new achievement{eligibleAchievements.length > 1 ? 's' : ''}!
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            Click on the achievement to mint your NFT badge
          </Typography>
        </Alert>
      )}

      {/* Filter Tabs */}
      <Tabs
        value={filterTab}
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        variant="fullWidth"
      >
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>All</span>
              <Chip label={totalCount} size="small" />
            </Stack>
          }
          value="all"
        />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircle fontSize="small" />
              <span>Earned</span>
              <Chip label={earnedCount} size="small" color="success" />
            </Stack>
          }
          value="earned"
        />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <Lock fontSize="small" />
              <span>Locked</span>
              <Chip label={totalCount - earnedCount} size="small" />
            </Stack>
          }
          value="locked"
        />
      </Tabs>

      {/* Achievement Grid */}
      {filteredAchievements.length > 0 ? (
        <Grid container spacing={3}>
          {filteredAchievements.map((achievement) => {
            const isEarned = earnedTypes.includes(achievement.type);
            const achievementData = getAchievementData(achievement.type);
            const progress = reputation
              ? calculateProgress(achievement, {
                  completedJobs: reputation.completedJobs,
                  totalReviews: reputation.totalReviews,
                  averageRating: reputation.averageRating / 10,
                  totalEarned: Number(reputation.totalEarned)
                })
              : 0;

            return (
              <Grid key={achievement.type} size={{ xs: 12, sm: 6, md: 4 }}>
                <AchievementBadge
                  achievement={achievement}
                  earned={isEarned}
                  earnedAt={achievementData?.account.mintedAt}
                  progress={progress}
                  onClick={() => handleAchievementClick(achievement.type)}
                />
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {filterTab === 'earned'
              ? 'No achievements earned yet'
              : filterTab === 'locked'
              ? 'All achievements unlocked!'
              : 'No achievements available'}
          </Typography>
          {filterTab === 'locked' && (
            <Typography variant="body2" color="text.secondary">
              Great job! You've earned all available achievements.
            </Typography>
          )}
        </Box>
      )}

      {/* Mint Dialog */}
      {selectedAchievement !== null && (
        <MintAchievementDialog
          achievementType={selectedAchievement}
          open={true}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </Box>
  );
}
