import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  alpha,
  IconButton,
  Stack,
  useTheme
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

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
            background: isDark
              ? `linear-gradient(135deg, ${alpha(achievement.color, 0.15)} 0%, ${alpha(achievement.color, 0.05)} 100%)`
              : `linear-gradient(135deg, ${alpha(achievement.color, 0.08)} 0%, ${alpha(achievement.color, 0.02)} 100%)`,
            overflow: 'visible',
            backgroundImage: 'none',
            border: 1,
            borderColor: alpha(achievement.color, 0.3),
            boxShadow: isDark ? `0 0 40px ${alpha(achievement.color, 0.2)}` : 10,
          }
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: 'text.secondary'
          }}
        >
          <Close />
        </IconButton>

        <DialogContent sx={{ textAlign: 'center', py: 6, px: 4 }}>
          {/* Achievement Icon with Animation */}
          <Box
            sx={{
              fontSize: 100,
              mb: 3,
              filter: isDark ? `drop-shadow(0 0 20px ${alpha(achievement.color, 0.6)})` : 'none',
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': {
                  transform: 'translateY(0px) rotate(0deg)'
                },
                '50%': {
                  transform: 'translateY(-15px) rotate(5deg)'
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
            fontWeight={800}
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              background: `linear-gradient(135deg, ${achievement.color} 0%, ${alpha(achievement.color, 0.6)} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              letterSpacing: 1,
            }}
          >
            Mission Complete
          </Typography>

          {/* Achievement Name */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              px: 3,
              py: 1,
              mb: 3,
              borderRadius: 2,
              border: 2,
              borderColor: achievement.color,
              bgcolor: alpha(achievement.color, 0.1),
              boxShadow: isDark ? `0 0 15px ${alpha(achievement.color, 0.3)}` : 'none',
            }}
          >
            <EmojiEvents sx={{ color: achievement.color, fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800} color={achievement.color} sx={{ fontFamily: '"Rajdhani", sans-serif', letterSpacing: 0.5 }}>
              {achievement.name.toUpperCase()}
            </Typography>
          </Box>

          {/* Description */}
          <Typography variant="body1" color="text.primary" paragraph sx={{ mb: 4, fontWeight: 500, lineHeight: 1.6 }}>
            {achievement.description}
          </Typography>

          {/* Requirement Badge */}
          <Box
            sx={{
              display: 'inline-block',
              px: 2,
              py: 0.75,
              mb: 4,
              borderRadius: 1,
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: 0.5, textTransform: 'uppercase', color: 'text.secondary' }}>
              CRITERIA: {achievement.requirement}
            </Typography>
          </Box>

          {/* Call to Action */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: '2px dashed',
              borderColor: alpha(achievement.color, 0.4),
              bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
              mb: 4
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif', fontSize: '0.9rem' }}>
              MINT ACHIEVEMENT NFT
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ fontWeight: 500 }}>
              Claim your permanent on-chain proof of reputation. This NFT badge will be 
              displayed on your global profile.
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={onClose}
              size="large"
              sx={{ fontWeight: 700, px: 4, borderRadius: 1.5 }}
            >
              LATER
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
                color: '#fff',
                fontWeight: 800,
                px: 4,
                borderRadius: 1.5,
                '&:hover': {
                  bgcolor: achievement.color,
                  filter: 'brightness(1.1)',
                  boxShadow: `0 0 20px ${alpha(achievement.color, 0.6)}`
                },
                boxShadow: `0 4px 15px ${alpha(achievement.color, 0.4)}`
              }}
            >
              MINT NFT
            </Button>
          </Stack>

          {/* Fun Fact */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 4, display: 'block', fontWeight: 600, opacity: 0.7 }}
          >
            ✨ DATA SYNCED TO SOLANA BLOCKCHAIN
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
