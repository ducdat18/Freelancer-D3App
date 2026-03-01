import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  Gavel,
  CheckCircle,
  Cancel,
  TrendingUp,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import {
  useStakingDispute,
  type JurorStakeData,
  type DisputeConfigData,
} from '../../hooks/useStakingDispute';

export default function JurorStakingPanel() {
  const { publicKey } = useWallet();
  const {
    stakeForJury,
    unstakeFromJury,
    fetchJurorStake,
    fetchDisputeConfig,
  } = useStakingDispute();

  const [stakeData, setStakeData] = useState<JurorStakeData | null>(null);
  const [configData, setConfigData] = useState<DisputeConfigData | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [stake, config] = await Promise.all([
        fetchJurorStake(publicKey),
        fetchDisputeConfig(),
      ]);
      setStakeData(stake);
      setConfigData(config);
    } catch (err: any) {
      console.error('Error loading juror stake data:', err);
      setError('Failed to load staking data');
    } finally {
      setLoading(false);
    }
  }, [publicKey, fetchJurorStake, fetchDisputeConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStake = async () => {
    if (!publicKey || !stakeAmount) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const amount = new BN(parseFloat(stakeAmount) * 1_000_000_000);

      // These would come from user's associated token account and the jury vault
      // In production, derive these from the config's staking token mint
      const jurorTokenAccount = publicKey; // Placeholder - should be ATA
      const juryVault = publicKey; // Placeholder - should be vault PDA

      await stakeForJury(amount, jurorTokenAccount, juryVault);
      setSuccess('Successfully staked for jury duty!');
      setStakeAmount('');
      await loadData();
    } catch (err: any) {
      console.error('Error staking:', err);
      setError(err.message || 'Failed to stake');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!publicKey) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const jurorTokenAccount = publicKey; // Placeholder - should be ATA
      const juryVault = publicKey; // Placeholder - should be vault PDA

      await unstakeFromJury(jurorTokenAccount, juryVault);
      setSuccess('Successfully unstaked from jury duty!');
      await loadData();
    } catch (err: any) {
      console.error('Error unstaking:', err);
      setError(err.message || 'Failed to unstake');
    } finally {
      setActionLoading(false);
    }
  };

  const accuracyRate =
    stakeData && stakeData.disputesParticipated > 0
      ? (stakeData.disputesCorrect / stakeData.disputesParticipated) * 100
      : 0;

  const minStakeDisplay = configData
    ? (configData.minStakeAmount.toNumber() / 1_000_000_000).toFixed(2)
    : '...';

  if (!publicKey) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            Please connect your wallet to manage juror staking.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading staking data..."
        logs={[
          { text: 'PDA: JUROR_REGISTRY seed=[juror-registry]', type: 'info' },
          { text: 'getAccountInfo(juror_stake[signer])...', type: 'info' },
          { text: 'getBalance(JURY_VAULT) → lamports...', type: 'info' },
          { text: 'Staking data decoded', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  return (
    <Card
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Gavel color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Juror Staking
          </Typography>
          {stakeData?.active ? (
            <Chip
              label="Active Juror"
              color="success"
              size="small"
              icon={<CheckCircle />}
            />
          ) : (
            <Chip
              label="Not Staked"
              color="default"
              size="small"
              icon={<Cancel />}
            />
          )}
        </Box>

        {/* Error / Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Current Stake Info */}
        {stakeData && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 2,
                mb: 3,
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(0,255,195,0.08)',
                  border: '1px solid rgba(0,255,195,0.2)',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Current Stake
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {(stakeData.amount.toNumber() / 1_000_000_000).toFixed(4)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  tokens
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(0,255,195,0.08)',
                  border: '1px solid rgba(0,255,195,0.2)',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Active Disputes
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {stakeData.activeDisputeCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  currently assigned
                </Typography>
              </Box>
            </Box>

            {/* Dispute Stats */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid',
                borderColor: 'divider',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Dispute Statistics
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700}>
                    {stakeData.disputesParticipated}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Participated
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700} color="success.main">
                    {stakeData.disputesCorrect}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Correct Votes
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {accuracyRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Accuracy Rate
                  </Typography>
                </Box>
              </Box>

              {/* Accuracy Progress Bar */}
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Accuracy
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {accuracyRate.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={accuracyRate}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background:
                        accuracyRate >= 70
                          ? 'linear-gradient(90deg, #00ffc3, #00ffc3)'
                          : accuracyRate >= 40
                            ? 'linear-gradient(90deg, #e04d01, #ff7033)'
                            : 'linear-gradient(90deg, #ff00ff, #ff55ff)',
                    },
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {/* Stake / Unstake Actions */}
        {!stakeData || !stakeData.active ? (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Stake to become a juror
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Minimum stake: {minStakeDisplay} tokens. Staked jurors can be
              selected to resolve disputes and earn rewards.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Stake Amount"
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: 0.01 }}
                disabled={actionLoading}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleStake}
                disabled={actionLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                sx={{
                  minWidth: 120,
                  py: 1,
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                {actionLoading ? <CircularProgress size={22} /> : 'Stake'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Unstake from jury duty
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {stakeData.activeDisputeCount > 0
                ? 'You cannot unstake while you have active disputes. Please wait for all assigned disputes to resolve.'
                : 'You have no active disputes. You can safely unstake your tokens.'}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleUnstake}
              disabled={actionLoading || stakeData.activeDisputeCount > 0}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {actionLoading ? <CircularProgress size={22} /> : 'Unstake'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
