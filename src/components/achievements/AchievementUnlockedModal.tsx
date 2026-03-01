import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  alpha,
  IconButton,
  Stack
} from '@mui/material';
import { Close, EmojiEvents } from '@mui/icons-material';
import { Achievement } from '../../config/achievements';
import Confetti from 'react-confetti';

interface AchievementUnlockedModalProps {
  achievement: Achievement;
  open: boolean;
  onClose: () => void;
  onMint?: () => void;
}

export default function AchievementUnlockedModal({
  achievement,
  open,
  onClose,
  onMint
}: AchievementUnlockedModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      // Update window size for confetti
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });

      // Stop confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <>
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
          colors={[achievement.color, '#FFD700', '#FF69B4', '#00CED1', '#FF6347']}
        />
      )}

      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: `linear-gradient(135deg, ${alpha(achievement.color, 0.2)} 0%, ${alpha(achievement.color, 0.05)} 100%)`,
            overflow: 'visible'
          }
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1
          }}
        >
          <Close />
        </IconButton>

        <DialogContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
          {/* Achievement Icon with Animation */}
          <Box
            sx={{
              fontSize: 120,
              mb: 3,
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': {
                  transform: 'translateY(0px)'
                },
                '50%': {
                  transform: 'translateY(-20px)'
                }
              }
            }}
          >
            {achievement.icon}
          </Box>

          {/* Title */}
          <Typography
            variant="h4"
            gutterBottom
            fontWeight="bold"
            sx={{
              background: `linear-gradient(135deg, ${achievement.color} 0%, ${alpha(achievement.color, 0.6)} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Achievement Unlocked!
          </Typography>

          {/* Achievement Name */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 3,
              py: 1,
              mb: 2,
              borderRadius: 2,
              border: `2px solid ${achievement.color}`,
              bgcolor: alpha(achievement.color, 0.1)
            }}
          >
            <EmojiEvents sx={{ color: achievement.color }} />
            <Typography variant="h5" fontWeight="bold" color={achievement.color}>
              {achievement.name}
            </Typography>
          </Box>

          {/* Description */}
          <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
            {achievement.description}
          </Typography>

          {/* Requirement Badge */}
          <Box
            sx={{
              display: 'inline-block',
              px: 2,
              py: 0.5,
              mb: 4,
              borderRadius: 1,
              bgcolor: 'action.hover'
            }}
          >
            <Typography variant="caption" fontWeight="bold">
              {achievement.requirement}
            </Typography>
          </Box>

          {/* Call to Action */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: `2px dashed ${achievement.color}`,
              bgcolor: alpha(achievement.color, 0.05),
              mb: 3
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Mint Your Achievement NFT
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Commemorate this milestone by minting a unique NFT badge. It will be permanently
              recorded on the Solana blockchain and displayed on your profile.
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={onClose}
              size="large"
            >
              Maybe Later
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (onMint) onMint();
                onClose();
              }}
              size="large"
              startIcon={<EmojiEvents />}
              sx={{
                bgcolor: achievement.color,
                '&:hover': {
                  bgcolor: achievement.color,
                  filter: 'brightness(0.9)'
                },
                boxShadow: `0 4px 20px ${alpha(achievement.color, 0.4)}`
              }}
            >
              Mint NFT
            </Button>
          </Stack>

          {/* Fun Fact */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 3, display: 'block' }}
          >
            ✨ This achievement is now part of your on-chain reputation
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
