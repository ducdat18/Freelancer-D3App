import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Tooltip,
  alpha
} from '@mui/material';
import { Lock, CheckCircle, EmojiEvents } from '@mui/icons-material';
import { Achievement } from '../../config/achievements';
import { formatDistanceToNow } from 'date-fns';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  earnedAt?: number;
  progress?: number; // 0-100
  onClick?: () => void;
  compact?: boolean;
}

export default function AchievementBadge({
  achievement,
  earned,
  earnedAt,
  progress = 0,
  onClick,
  compact = false
}: AchievementBadgeProps) {
  const isLocked = !earned;

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'visible',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        opacity: isLocked ? 0.6 : 1,
        filter: isLocked ? 'grayscale(100%)' : 'none',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          filter: isLocked ? 'grayscale(80%)' : 'none',
        } : {},
        background: earned
          ? `linear-gradient(135deg, ${alpha(achievement.color, 0.1)} 0%, ${alpha(achievement.color, 0.05)} 100%)`
          : 'background.paper',
        border: earned ? `2px solid ${achievement.color}` : '2px solid transparent',
      }}
      onClick={onClick}
    >
      {/* Earned Badge Indicator */}
      {earned && (
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            right: -12,
            zIndex: 1
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: achievement.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 3,
              animation: earned ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(1.1)',
                },
              },
            }}
          >
            <CheckCircle sx={{ color: 'white', fontSize: 24 }} />
          </Box>
        </Box>
      )}

      {/* Locked Indicator */}
      {isLocked && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1
          }}
        >
          <Lock sx={{ color: 'text.disabled', fontSize: 20 }} />
        </Box>
      )}

      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {/* Icon */}
        <Box
          sx={{
            fontSize: compact ? 48 : 64,
            textAlign: 'center',
            mb: 2,
            filter: isLocked ? 'grayscale(100%)' : 'none',
          }}
        >
          {achievement.icon}
        </Box>

        {/* Name */}
        <Typography
          variant={compact ? 'h6' : 'h5'}
          gutterBottom
          textAlign="center"
          sx={{
            fontWeight: 'bold',
            color: earned ? achievement.color : 'text.primary'
          }}
        >
          {achievement.name}
        </Typography>

        {/* Description */}
        {!compact && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ mb: 2, minHeight: 40 }}
          >
            {achievement.description}
          </Typography>
        )}

        {/* Requirement */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip
            label={achievement.requirement}
            size="small"
            icon={<EmojiEvents />}
            sx={{
              bgcolor: earned ? alpha(achievement.color, 0.1) : 'action.hover',
              color: earned ? achievement.color : 'text.secondary',
              fontWeight: 500
            }}
          />
        </Box>

        {/* Progress Bar (for locked achievements) */}
        {isLocked && progress > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  bgcolor: achievement.color
                }
              }}
            />
          </Box>
        )}

        {/* Earned Date */}
        {earned && earnedAt && (
          <Tooltip title={new Date(earnedAt * 1000).toLocaleString()}>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              display="block"
              sx={{ mt: 1 }}
            >
              Earned {formatDistanceToNow(new Date(earnedAt * 1000), { addSuffix: true })}
            </Typography>
          </Tooltip>
        )}

        {/* Mint Button Indicator */}
        {!earned && progress >= 100 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Chip
              label="Ready to Mint!"
              color="success"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for displaying in profile
export function CompactAchievementBadge({
  achievement,
  earned,
  earnedAt,
  onClick
}: Pick<AchievementBadgeProps, 'achievement' | 'earned' | 'earnedAt' | 'onClick'>) {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" fontWeight="bold">
            {achievement.name}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {achievement.description}
          </Typography>
          {earned && earnedAt && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
              Earned {formatDistanceToNow(new Date(earnedAt * 1000), { addSuffix: true })}
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Box
        onClick={onClick}
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          cursor: onClick ? 'pointer' : 'default',
          border: earned ? `3px solid ${achievement.color}` : '3px solid transparent',
          bgcolor: earned ? alpha(achievement.color, 0.1) : 'action.hover',
          filter: earned ? 'none' : 'grayscale(100%)',
          opacity: earned ? 1 : 0.5,
          transition: 'all 0.3s ease',
          '&:hover': onClick ? {
            transform: 'scale(1.1)',
            boxShadow: 3,
          } : {}
        }}
      >
        {achievement.icon}
      </Box>
    </Tooltip>
  );
}
