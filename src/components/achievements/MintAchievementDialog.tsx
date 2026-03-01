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
  alpha
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

const STEPS = ['Confirm', 'Create Metadata', 'Mint NFT', 'Record On-Chain'];

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

      // In production, use real Metaplex:
      // const { nftMint, metadataUri } = await createAchievementNFT(
      //   connection,
      //   wallet,
      //   achievement,
      //   wallet.publicKey.toBase58(),
      //   upload
      // );

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
            ? `linear-gradient(135deg, ${alpha(achievement.color, 0.1)} 0%, ${alpha(achievement.color, 0.05)} 100%)`
            : 'background.paper'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ fontSize: 48 }}>{achievement.icon}</Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {success ? 'Achievement Unlocked!' : 'Mint Achievement NFT'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {achievement.name}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success ? (
          // Success State
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: achievement.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 3,
                animation: 'bounce 1s ease-in-out',
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.2)' }
                }
              }}
            >
              <Celebration sx={{ fontSize: 60, color: 'white' }} />
            </Box>

            <Typography variant="h5" gutterBottom fontWeight="bold" color={achievement.color}>
              Congratulations!
            </Typography>

            <Typography variant="body1" color="text.secondary" paragraph>
              Your achievement NFT has been minted successfully!
            </Typography>

            {txSignature && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                  Transaction: {txSignature.slice(0, 20)}...
                </Typography>
              </Alert>
            )}
          </Box>
        ) : (
          // Minting State
          <>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                {achievement.description}
              </Typography>
            </Box>

            {!minting && !error && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This will mint a unique NFT badge to commemorate your achievement. The NFT will be
                recorded on the Solana blockchain and stored in your wallet.
              </Alert>
            )}

            {minting && (
              <Box sx={{ my: 4 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {STEPS.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <LoadingSpinner
                  message={`${STEPS[activeStep]}...`}
                  logs={[
                    { text: 'Constructing mint_achievement IX...', type: 'info' },
                    { text: 'Serializing Anchor instruction data...', type: 'info' },
                    { text: 'sendAndConfirmTransaction(devnet)...', type: 'info' },
                    { text: 'Awaiting finalization (~32 slots)...', type: 'query' },
                  ]}
                  sx={{ mt: 2, maxWidth: '100%' }}
                />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Cost Info */}
            {!minting && !error && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Estimated cost:
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  ~0.01 SOL
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (Transaction fees + NFT creation)
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {!success && (
          <>
            <Button onClick={handleClose} disabled={minting}>
              Cancel
            </Button>
            <Button
              onClick={handleMint}
              variant="contained"
              disabled={minting}
              startIcon={minting ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{
                bgcolor: achievement.color,
                '&:hover': {
                  bgcolor: achievement.color,
                  filter: 'brightness(0.9)'
                }
              }}
            >
              {minting ? 'Minting...' : 'Mint NFT'}
            </Button>
          </>
        )}
        {success && (
          <Button onClick={handleClose} variant="contained" fullWidth>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
