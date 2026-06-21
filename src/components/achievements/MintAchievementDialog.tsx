import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  alpha,
  useTheme
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import { CheckCircle, Celebration } from '@mui/icons-material';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAchievementByType } from '../../config/achievements';
import { useAchievements } from '../../hooks/useAchievements';
import { useIPFS } from '../../hooks/useIPFS';
import { mockCreateAchievementNFT } from '../../services/metaplex';

interface MintAchievementDialogProps {
  achievementType: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = ['Confirm', 'Metadata', 'Minting', 'On-Chain'];

export default function MintAchievementDialog({
  achievementType,
  open,
  onClose,
  onSuccess
}: MintAchievementDialogProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { mintAchievement } = useAchievements();
  const { upload } = useIPFS();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [activeStep, setActiveStep] = useState(0);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const achievement = getAchievementByType(achievementType);

  if (!achievement) {
    return null;
  }

  const handleMint = async () => {
    if (!wallet.publicKey) {
      setError('Please connect your wallet');
      return;
    }

    setMinting(true);
    setError(null);

    try {
      // Step 1: Create metadata
      setActiveStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Mint NFT (using mock for now)
      setActiveStep(2);
      const { nftMint, metadataUri } = await mockCreateAchievementNFT(
        achievement,
        wallet.publicKey.toBase58()
      );

      // Step 3: Record on-chain
      setActiveStep(3);
      const result = await mintAchievement(achievementType, nftMint);

      setTxSignature(result.signature);
      setSuccess(true);
      setActiveStep(4);

      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error minting achievement:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint achievement');
      setActiveStep(0);
    } finally {
      setMinting(false);
    }
  };

  const handleClose = () => {
    if (!minting) {
      onClose();
      // Reset state after close animation
      setTimeout(() => {
        setActiveStep(0);
        setError(null);
        setSuccess(false);
        setTxSignature(null);
      }, 300);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: success
            ? (isDark 
                ? `linear-gradient(135deg, ${alpha(achievement.color, 0.1)} 0%, ${alpha(achievement.color, 0.05)} 100%)`
                : `linear-gradient(135deg, ${alpha(achievement.color, 0.05)} 0%, ${alpha(achievement.color, 0.02)} 100%)`)
            : 'background.paper',
          backgroundImage: 'none',
          border: 1,
          borderColor: success ? alpha(achievement.color, 0.3) : 'divider',
        }
      }}
    >
      <DialogTitle sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box 
            sx={{ 
              fontSize: 48, 
              filter: isDark ? `drop-shadow(0 0 10px ${alpha(achievement.color, 0.4)})` : 'none',
              bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              width: 72, height: 72, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 1, borderColor: 'divider'
            }}
          >
            {achievement.icon}
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: 0.5 }}>
              {success ? 'Achievement Minted!' : 'Claim Milestone NFT'}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {achievement.name}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 4 }}>
        {success ? (
          // Success State
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: achievement.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 3,
                boxShadow: `0 0 20px ${alpha(achievement.color, 0.5)}`,
                animation: 'bounce 1s ease-in-out',
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' }
                }
              }}
            >
              <Celebration sx={{ fontSize: 40, color: '#fff' }} />
            </Box>

            <Typography variant="h5" gutterBottom fontWeight={800} color={achievement.color} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
              CONGRATULATIONS!
            </Typography>

            <Typography variant="body1" color="text.primary" paragraph sx={{ fontWeight: 500, mt: 2 }}>
              Your permanent on-chain reputation record has been created successfully.
            </Typography>

            {txSignature && (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 3, 
                  bgcolor: isDark ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.05)',
                  border: 1, borderColor: 'success.light'
                }}
              >
                <Typography variant="caption" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontWeight: 600 }}>
                  SIG: {txSignature}
                </Typography>
              </Alert>
            )}
          </Box>
        ) : (
          // Minting State
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                {achievement.description}
              </Typography>
            </Box>

            {!minting && !error && (
              <Alert severity="info" sx={{ mb: 3, fontWeight: 500 }}>
                This will mint a unique NFT badge. The NFT will be permanently
                stored in your wallet as proof of expertise.
              </Alert>
            )}

            {minting && (
              <Box sx={{ my: 4 }}>
                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                  {STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel
                        StepIconProps={{
                          sx: {
                            '&.Mui-active': { color: achievement.color },
                            '&.Mui-completed': { color: theme.palette.success.main }
                          }
                        }}
                      >
                        <Typography variant="caption" fontWeight={700}>{label}</Typography>
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <LoadingSpinner
                  message={`${STEPS[activeStep]} in progress...`}
                  logs={[
                    { text: 'Constructing mint_achievement IX...', type: 'info' },
                    { text: 'Serializing Anchor instruction data...', type: 'info' },
                    { text: 'Awaiting RPC finalization...', type: 'query' },
                  ]}
                  sx={{ mt: 2, maxWidth: '100%' }}
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2, fontWeight: 500 }}>
                {error}
              </Alert>
            )}

            {/* Cost Info */}
            {!minting && !error && (
              <Box
                sx={{
                  mt: 3,
                  p: 2.5,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5, display: 'block' }}>
                    ESTIMATED COST
                  </Typography>
                  <Typography variant="caption" color="text.disabled" fontWeight={500}>
                    Fees + NFT Rent
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  ~0.01 SOL
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!success && (
          <>
            <Button onClick={handleClose} disabled={minting} sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              onClick={handleMint}
              variant="contained"
              disabled={minting}
              startIcon={minting ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
              sx={{
                bgcolor: achievement.color,
                color: '#fff',
                fontWeight: 800,
                px: 4,
                '&:hover': {
                  bgcolor: achievement.color,
                  filter: 'brightness(1.1)',
                  boxShadow: `0 0 15px ${alpha(achievement.color, 0.4)}`
                }
              }}
            >
              {minting ? 'MINTING...' : 'CONFIRM MINT'}
            </Button>
          </>
        )}
        {success && (
          <Button onClick={handleClose} variant="contained" fullWidth sx={{ fontWeight: 800, py: 1.25 }}>
            CLOSE
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
