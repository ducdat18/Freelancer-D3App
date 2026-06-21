import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Tooltip,
  alpha,
  useTheme
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
          boxShadow: isDark ? `0 0 24px ${alpha(achievement.color, 0.2)}` : '0 8px 32px rgba(0,0,0,0.1)',
          filter: isLocked ? 'grayscale(80%)' : 'none',
          borderColor: achievement.color,
        } : {},
        background: earned
          ? (isDark 
              ? `linear-gradient(135deg, ${alpha(achievement.color, 0.12)} 0%, ${alpha(achievement.color, 0.04)} 100%)`
              : `linear-gradient(135deg, ${alpha(achievement.color, 0.08)} 0%, ${alpha(achievement.color, 0.02)} 100%)`)
          : 'background.paper',
        border: 1,
        borderColor: earned ? alpha(achievement.color, 0.5) : 'divider',
        backgroundImage: 'none',
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
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: achievement.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark ? `0 0 15px ${alpha(achievement.color, 0.5)}` : '0 4px 10px rgba(0,0,0,0.2)',
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
            <CheckCircle sx={{ color: '#fff', fontSize: 20 }} />
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
          <Lock sx={{ color: 'text.disabled', fontSize: 18 }} />
        </Box>
      )}

      <CardContent sx={{ p: compact ? 2 : 3 }}>
        {/* Icon */}
        <Box
          sx={{
            fontSize: compact ? 40 : 56,
            textAlign: 'center',
            mb: 2,
            filter: isLocked ? 'grayscale(100%) opacity(0.5)' : (isDark ? `drop-shadow(0 0 10px ${alpha(achievement.color, 0.4)})` : 'none'),
          }}
        >
          {achievement.icon}
        </Box>

        {/* Name */}
        <Typography
          variant={compact ? 'subtitle1' : 'h6'}
          gutterBottom
          textAlign="center"
          sx={{
            fontWeight: 800,
            color: earned ? (isDark ? achievement.color : 'text.primary') : 'text.disabled',
            fontFamily: '"Orbitron", sans-serif',
            letterSpacing: 0.5
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
            sx={{ mb: 2.5, minHeight: 40, lineHeight: 1.5, fontWeight: 500 }}
          >
            {achievement.description}
          </Typography>
        )}

        {/* Requirement */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Chip
            label={achievement.requirement}
            size="small"
            icon={<EmojiEvents sx={{ fontSize: '0.9rem !important' }} />}
            sx={{
              bgcolor: isDark ? alpha(achievement.color, 0.1) : alpha(achievement.color, 0.05),
              color: isDark ? achievement.color : alpha(achievement.color, 0.9),
              fontWeight: 700,
              fontSize: '0.65rem',
              height: 22,
              border: 1,
              borderColor: alpha(achievement.color, 0.2)
            }}
          />
        </Box>

        {/* Progress Bar (for locked achievements) */}
        {isLocked && progress > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Progress
              </Typography>
              <Typography variant="caption" fontWeight={800} color="primary.main">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: achievement.color,
                  borderRadius: 3
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
              sx={{ mt: 1.5, fontWeight: 600, opacity: 0.8 }}
            >
              Unlocked {formatDistanceToNow(new Date(earnedAt * 1000), { addSuffix: true })}
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
              sx={{ fontWeight: 800, fontSize: '0.65rem', animation: 'pulse 2s infinite' }}
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
            {achievement.name}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontWeight: 500 }}>
            {achievement.description}
          </Typography>
          {earned && earnedAt && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8, fontWeight: 700 }}>
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
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          cursor: onClick ? 'pointer' : 'default',
          border: 2,
          borderColor: earned ? achievement.color : 'divider',
          bgcolor: earned ? alpha(achievement.color, 0.1) : (isDark ? 'rgba(255,255,255,0.03)' : 'grey.50'),
          filter: earned ? (isDark ? `drop-shadow(0 0 8px ${alpha(achievement.color, 0.4)})` : 'none') : 'grayscale(100%)',
          opacity: earned ? 1 : 0.4,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': onClick ? {
            transform: 'scale(1.15) rotate(5deg)',
            boxShadow: isDark ? `0 0 20px ${alpha(achievement.color, 0.3)}` : '0 4px 15px rgba(0,0,0,0.1)',
            borderColor: achievement.color,
            opacity: 1,
          } : {}
        }}
      >
        {achievement.icon}
      </Box>
    </Tooltip>
  );
}
