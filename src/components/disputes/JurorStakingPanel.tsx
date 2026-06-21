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
  useTheme,
  alpha,
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
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

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
      <Card sx={{ border: 1, borderColor: 'divider' }}>
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
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        backgroundImage: 'none',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Gavel sx={{ color: primaryMain }} />
          <Typography variant="h6" fontWeight={700}>
            Juror Staking
          </Typography>
          {stakeData?.active ? (
            <Chip
              label="Active Juror"
              color="success"
              size="small"
              icon={<CheckCircle />}
              sx={{ fontWeight: 700, height: 24 }}
            />
          ) : (
            <Chip
              label="Not Staked"
              color="default"
              size="small"
              icon={<Cancel />}
              sx={{ fontWeight: 700, height: 24 }}
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
                  bgcolor: isDark ? 'rgba(0,255,195,0.08)' : 'rgba(5,150,105,0.05)',
                  border: 1,
                  borderColor: isDark ? 'rgba(0,255,195,0.2)' : 'rgba(5,150,105,0.2)',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  CURRENT STAKE
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                  {(stakeData.amount.toNumber() / 1_000_000_000).toFixed(4)}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  tokens
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(0,255,195,0.08)' : 'rgba(5,150,105,0.05)',
                  border: 1,
                  borderColor: isDark ? 'rgba(0,255,195,0.2)' : 'rgba(5,150,105,0.2)',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  ACTIVE DISPUTES
                </Typography>
                <Typography variant="h5" fontWeight={800} color={theme.palette.success.main} sx={{ mt: 0.5 }}>
                  {stakeData.activeDisputeCount}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  assigned
                </Typography>
              </Box>
            </Box>

            {/* Dispute Stats */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: 2,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'grey.50',
                border: 1,
                borderColor: 'divider',
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <TrendingUp fontSize="small" sx={{ color: primaryMain }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Dispute Statistics
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                  mb: 3,
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={800}>
                    {stakeData.disputesParticipated}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Participated
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={800} color={theme.palette.success.main}>
                    {stakeData.disputesCorrect}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Correct Votes
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={800} color="primary.main">
                    {accuracyRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Accuracy
                  </Typography>
                </Box>
              </Box>

              {/* Accuracy Progress Bar */}
              <Box sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    ACCURACY RATE
                  </Typography>
                  <Typography variant="caption" color="text.primary" fontWeight={800}>
                    {accuracyRate.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={accuracyRate}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background:
                        accuracyRate >= 70
                          ? theme.palette.success.main
                          : accuracyRate >= 40
                            ? theme.palette.warning.main
                            : theme.palette.error.main,
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
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Become a Juror
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
              Minimum stake: <strong>{minStakeDisplay} tokens</strong>. Staked jurors help maintain network integrity by resolving disputes and earning rewards.
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
                onClick={handleStake}
                disabled={actionLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                sx={{
                  minWidth: 120,
                  height: 40,
                  fontWeight: 700,
                }}
              >
                {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Stake'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Unstake Tokens
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
              {stakeData.activeDisputeCount > 0
                ? 'You cannot unstake while you have active disputes assigned. Please wait for resolution.'
                : 'You have no active disputes. You can safely unstake your tokens at any time.'}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={handleUnstake}
              disabled={actionLoading || stakeData.activeDisputeCount > 0}
              sx={{
                minWidth: 120,
                fontWeight: 700,
              }}
            >
              {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Withdraw Stake'}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
