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
  Stack,
  useTheme
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: 1 }}>
            Achievements
          </Typography>
          <Chip
            icon={<EmojiEvents sx={{ fontSize: '1rem !important' }} />}
            label={`${earnedCount} / ${totalCount} COLLECTED`}
            color="primary"
            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 28, px: 1 }}
          />
        </Box>

        {/* Progress Bar */}
        <Box sx={{ p: 2.5, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50', borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1 }}>
              PROTOCOL COMPLETION
            </Typography>
            <Typography variant="caption" fontWeight={800} color="primary.main">
              {Math.round(progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: 1,
              borderColor: 'divider',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`
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
          sx={{ mb: 4, border: 1, borderColor: 'success.light', bgcolor: isDark ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.05)' }}
        >
          <Typography variant="body2" fontWeight={700}>
            🎉 You&apos;ve unlocked {eligibleAchievements.length} new milestone{eligibleAchievements.length > 1 ? 's' : ''}!
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 500 }}>
            Click any badge below to mint your permanent on-chain NFT record.
          </Typography>
        </Alert>
      )}

      {/* Filter Tabs */}
      <Tabs
        value={filterTab}
        onChange={handleTabChange}
        sx={{ 
          mb: 4, 
          borderBottom: 1, 
          borderColor: 'divider',
          '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' }
        }}
        variant="fullWidth"
      >
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>All</span>
              <Chip label={totalCount} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
            </Stack>
          }
          value="all"
        />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircle fontSize="small" />
              <span>Earned</span>
              <Chip label={earnedCount} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
            </Stack>
          }
          value="earned"
        />
        <Tab
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <Lock fontSize="small" />
              <span>Locked</span>
              <Chip label={totalCount - earnedCount} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
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
        <Box sx={{ textAlign: 'center', py: 10, border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom fontWeight={600}>
            {filterTab === 'earned'
              ? 'No achievements earned yet'
              : filterTab === 'locked'
              ? 'All achievements unlocked!'
              : 'No achievements available'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filterTab === 'earned' 
              ? 'Complete jobs and build reputation to unlock badges.' 
              : 'Keep up the great work!'}
          </Typography>
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
