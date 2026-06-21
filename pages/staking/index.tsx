import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Divider,
  Tooltip,
  Avatar,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import TimerIcon from '@mui/icons-material/Timer';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PercentIcon from '@mui/icons-material/Percent';
import PaidIcon from '@mui/icons-material/Paid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScienceIcon from '@mui/icons-material/Science';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { formatDistanceToNow } from 'date-fns';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useGovernanceToken } from '../../src/hooks/useGovernanceToken';
import {
  LOCK_PERIOD_CONFIGS,
  getAPRForLockPeriod,
  getLiveAccrualPerSecond,
  getSimHistory,
  type TxHistoryEntry,
} from '../../src/utils/stakingSimulator';

const GVT_DECIMALS = 1e9;

function fmt(amount: number, decimals = 4): string {
  return (amount / GVT_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Unlocked';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function shortSig(sig: string): string {
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

// ─── Lock period picker card ─────────────────────────────────────────────────

function LockPeriodCard({
  config,
  selected,
  onClick,
}: {
  config: typeof LOCK_PERIOD_CONFIGS[number];
  selected: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const aprPct = Math.round(config.apr * 100);
  const aprColor =
    aprPct >= 40 ? theme.palette.primary.main :
    aprPct >= 20 ? theme.palette.secondary.main :
    aprPct >= 10 ? theme.palette.warning.main :
    theme.palette.text.disabled;

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: selected ? aprColor : 'divider',
        background: selected
          ? alpha(aprColor, isDark ? 0.12 : 0.08)
          : (isDark ? alpha(theme.palette.common.white, 0.02) : theme.palette.background.paper),
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
        '&:hover': {
          borderColor: aprColor,
          background: selected ? alpha(aprColor, isDark ? 0.18 : 0.12) : alpha(aprColor, 0.05),
        },
      }}
    >
      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, letterSpacing: 0.5 }}>
        {config.label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={800}
        sx={{ color: selected ? aprColor : 'text.secondary', fontFamily: '"Orbitron", monospace' }}
      >
        {aprPct}%
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        APR
      </Typography>
      {selected && (
        <CheckCircleIcon sx={{ display: 'block', mx: 'auto', mt: 0.5, fontSize: 16, color: aprColor }} />
      )}
    </Box>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Staking() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const { program } = useSolanaProgram();
  // @ts-ignore
  const isOnChain = typeof program?.methods?.stakeTokens === 'function';

  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const {
    platformConfig,
    tokenStake,
    loading,
    error,
    fetchPlatformConfig,
    fetchTokenStake,
    stakeTokens,
    unstakeTokens,
    claimStakingRewards,
  } = useGovernanceToken();

  const [selectedLockIdx, setSelectedLockIdx] = useState(1); // 1 Month default
  const lockConfig = LOCK_PERIOD_CONFIGS[selectedLockIdx];

  const [stakeAmount, setStakeAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [history, setHistory] = useState<TxHistoryEntry[]>([]);

  // Live rewards ticker — updates every second
  const [liveRewards, setLiveRewards] = useState(0);

  useEffect(() => {
    if (!tokenStake || tokenStake.amount === 0) {
      setLiveRewards(tokenStake?.accumulatedRewards ?? 0);
      return;
    }
    // Seed with current value
    setLiveRewards(tokenStake.accumulatedRewards);
    const ratePerSec = getLiveAccrualPerSecond(tokenStake);
    const interval = setInterval(() => {
      setLiveRewards(prev => prev + ratePerSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [tokenStake]);

  const loadData = useCallback(async () => {
    setInitialLoading(true);
    try {
      await fetchPlatformConfig();
      if (publicKey) {
        await fetchTokenStake(publicKey);
        if (!isOnChain) {
          setHistory(getSimHistory(publicKey.toBase58()));
        }
      }
    } finally {
      setInitialLoading(false);
    }
  }, [fetchPlatformConfig, fetchTokenStake, publicKey, isOnChain]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = Math.floor(Date.now() / 1000);
  const isLocked = tokenStake ? tokenStake.lockUntil > now : false;
  const lockRemaining = tokenStake && isLocked ? tokenStake.lockUntil - now : 0;
  const lockTotal = tokenStake ? tokenStake.lockUntil - tokenStake.stakedAt : 0;
  const lockElapsed = tokenStake ? Math.max(0, now - tokenStake.stakedAt) : 0;
  const lockProgress = lockTotal > 0 ? Math.min(100, (lockElapsed / lockTotal) * 100) : 0;
  const stakedAPR = tokenStake
    ? Math.round(getAPRForLockPeriod(lockTotal) * 100)
    : 0;

  // Estimated APR for the amount being entered
  const selectedAPR = Math.round(lockConfig.apr * 100);
  const estDailyReward = stakeAmount
    ? (parseFloat(stakeAmount) * lockConfig.apr) / 365
    : 0;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setActionError('Please enter a valid amount.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const lamports = Math.floor(parseFloat(stakeAmount) * GVT_DECIMALS);
      const result = await stakeTokens(lamports, lockConfig.seconds);
      setSuccessMessage(
        `Successfully staked ${stakeAmount} GVT for ${lockConfig.label} at ${selectedAPR}% APR.\nTx: ${(result as any).signature}`
      );
      setStakeAmount('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Stake failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnstake = async () => {
    setActionLoading(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const result = await unstakeTokens();
      setSuccessMessage(`Unstaked successfully.\nTx: ${(result as any).signature}`);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Unstake failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaim = async () => {
    setActionLoading(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      const result = await claimStakingRewards();
      setSuccessMessage(`Claimed rewards successfully.\nTx: ${(result as any).signature}`);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Claim failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Early returns ─────────────────────────────────────────────────────────

  if (!connected) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your wallet to access the staking dashboard."
            actionLabel="Connect Wallet"
            onAction={() => setVisible(true)}
          />
        </Container>
      </Layout>
    );
  }

  if (initialLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner message="Loading staking data..." />
        </Container>
      </Layout>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif' }}>
              Token Staking
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              Stake GVT governance tokens to earn rewards and participate in platform decisions.
            </Typography>
          </Box>
          {/* Simulation badge */}
          {!isOnChain && (
            <Chip
              icon={<ScienceIcon sx={{ fontSize: '0.9rem !important' }} />}
              label="DEVNET SIMULATION"
              size="small"
              sx={{
                fontFamily: '"Orbitron", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                bgcolor: isDark ? 'rgba(224,77,1,0.15)' : 'rgba(224,77,1,0.08)',
                color: theme.palette.warning.main,
                border: 1,
                borderColor: alpha(theme.palette.warning.main, 0.35),
                fontWeight: 700,
              }}
            />
          )}
        </Box>

        {/* Simulation notice */}
        {!isOnChain && (
          <Alert
            severity="info"
            icon={<ScienceIcon />}
            sx={{ mb: 4, border: 1, borderColor: alpha(secondaryMain, 0.3), bgcolor: isDark ? alpha(secondaryMain, 0.08) : alpha(secondaryMain, 0.05) }}
          >
            <Typography variant="body2" fontWeight={700} gutterBottom>
              Staking Preview
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Staking rewards are calculated in real-time and persist across sessions. On-chain settlement is processed at the end of each staking period.
            </Typography>
          </Alert>
        )}

        {/* Alerts */}
        {successMessage && (
          <Alert
            severity="success"
            sx={{ mb: 3, whiteSpace: 'pre-line', fontWeight: 600 }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 500 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}
        {error && !successMessage && (
          <Alert severity="warning" sx={{ mb: 3, fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        {/* ── Stats cards ── */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {/* Total Staked */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 3, textAlign: 'center',
              border: 1,
              borderColor: alpha(primaryMain, 0.2),
              bgcolor: 'background.paper',
              backgroundImage: isDark ? `linear-gradient(135deg, ${alpha(primaryMain, 0.05)} 0%, transparent 100%)` : `linear-gradient(135deg, ${alpha(primaryMain, 0.02)} 0%, transparent 100%)`,
              borderRadius: 3,
            }}>
              <LockIcon sx={{ fontSize: 36, color: primaryMain, mb: 1, opacity: 0.8 }} />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Staked</Typography>
              <Typography variant="h5" fontWeight={800} fontFamily='"Orbitron", monospace' sx={{ my: 0.5 }}>
                {platformConfig ? fmt(platformConfig.totalStaked, 2) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>GVT</Typography>
            </Paper>
          </Grid>

          {/* Your Stake */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 3, textAlign: 'center',
              border: 1,
              borderColor: alpha(secondaryMain, 0.2),
              bgcolor: 'background.paper',
              backgroundImage: isDark ? `linear-gradient(135deg, ${alpha(secondaryMain, 0.05)} 0%, transparent 100%)` : `linear-gradient(135deg, ${alpha(secondaryMain, 0.02)} 0%, transparent 100%)`,
              borderRadius: 3,
            }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 36, color: secondaryMain, mb: 1, opacity: 0.8 }} />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Stake</Typography>
              <Typography variant="h5" fontWeight={800} fontFamily='"Orbitron", monospace' sx={{ my: 0.5 }}>
                {tokenStake ? fmt(tokenStake.amount, 2) : '0.00'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>GVT</Typography>
              {tokenStake && tokenStake.amount > 0 && (
                <Chip label={`${stakedAPR}% APR`} size="small"
                  sx={{ mt: 1, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha(secondaryMain, 0.15), color: secondaryMain, border: 1, borderColor: alpha(secondaryMain, 0.2) }} />
              )}
            </Paper>
          </Grid>

          {/* Live Rewards */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 3, textAlign: 'center',
              border: 1,
              borderColor: alpha(primaryMain, 0.2),
              bgcolor: 'background.paper',
              backgroundImage: isDark ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, transparent 100%)` : `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.02)} 0%, transparent 100%)`,
              borderRadius: 3,
            }}>
              <CardGiftcardIcon sx={{ fontSize: 36, color: primaryMain, mb: 1, opacity: 0.8 }} />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Live Rewards
                {tokenStake && tokenStake.amount > 0 && (
                  <Box component="span" sx={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    bgcolor: primaryMain, ml: 1, mb: '2px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    boxShadow: `0 0 8px ${primaryMain}`,
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                    },
                  }} />
                )}
              </Typography>
              <Typography variant="h5" fontWeight={800} fontFamily='"Orbitron", monospace' sx={{ color: primaryMain, my: 0.5 }}>
                {fmt(liveRewards, 6)}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>GVT</Typography>
            </Paper>
          </Grid>

          {/* Lock Remaining */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 3, textAlign: 'center',
              border: 1,
              borderColor: alpha(theme.palette.warning.main, 0.2),
              bgcolor: 'background.paper',
              backgroundImage: isDark ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, transparent 100%)` : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.02)} 0%, transparent 100%)`,
              borderRadius: 3,
            }}>
              <TimerIcon sx={{ fontSize: 36, color: theme.palette.warning.main, mb: 1, opacity: 0.8 }} />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lock Remaining</Typography>
              <Typography variant="h5" fontWeight={800} fontFamily='"Orbitron", monospace' sx={{ my: 0.5 }}>
                {formatDuration(lockRemaining)}
              </Typography>
              {tokenStake && tokenStake.amount > 0 && (
                <Box sx={{ mt: 1.5, px: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={lockProgress}
                    sx={{
                      height: 4, borderRadius: 2,
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isLocked ? 'warning.main' : 'success.main',
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600, mt: 0.5, display: 'block' }}>
                    {Math.round(lockProgress)}% ELAPSED
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── Current stake info (if staked) ── */}
        {tokenStake && tokenStake.amount > 0 && (
          <Paper sx={{ p: 3, mb: 4, border: 1, borderColor: alpha(primaryMain, 0.15), borderRadius: 3, backgroundImage: 'none' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1.1rem' }}>
              Active Position
            </Typography>
            <Grid container spacing={3} alignItems="center" sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Staked Since</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>
                  {new Date(tokenStake.stakedAt * 1000).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="text.disabled" fontWeight={600}>
                  ({formatDistanceToNow(new Date(tokenStake.stakedAt * 1000), { addSuffix: true })})
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Unlock Date</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>
                  {isLocked
                    ? new Date(tokenStake.lockUntil * 1000).toLocaleDateString()
                    : <Box component="span" sx={{ color: 'success.main' }}>Unlocked ✓</Box>
                  }
                </Typography>
                {isLocked && (
                  <Typography variant="caption" color="text.disabled" fontWeight={600}>
                    ({formatDuration(lockRemaining)} left)
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Daily Reward Rate</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ color: primaryMain, mt: 0.5, fontFamily: '"Orbitron", monospace' }}>
                  +{fmt(getLiveAccrualPerSecond(tokenStake) * 86400, 4)} GVT
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* ── Stake form ── */}
        <Paper sx={{ p: { xs: 2.5, md: 4 }, mb: 4, borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1.1rem' }}>
            Stake Tokens
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500, lineHeight: 1.6 }}>
            Choose a lock period and enter an amount. Longer lock periods yield higher APR.
            {!isOnChain && ' In simulation mode you can enter any amount.'}
          </Typography>

          {/* Lock period cards */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Lock Period
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {LOCK_PERIOD_CONFIGS.map((cfg, idx) => (
              <Grid key={cfg.seconds} size={{ xs: 6, sm: 3 }}>
                <LockPeriodCard
                  config={cfg}
                  selected={selectedLockIdx === idx}
                  onClick={() => setSelectedLockIdx(idx)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Amount input + stake button */}
          <Grid container spacing={3} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                fullWidth
                label="Stake Amount (GVT)"
                type="number"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                placeholder="0.00"
                inputProps={{ min: 0, step: 'any' }}
                disabled={actionLoading}
                helperText={
                  stakeAmount && parseFloat(stakeAmount) > 0
                    ? `Est. reward: +${estDailyReward.toFixed(4)} GVT/day · Monthly: +${(estDailyReward * 30).toFixed(4)} GVT`
                    : 'Enter an amount to see estimated rewards'
                }
                sx={{ '& .MuiInputBase-input': { fontWeight: 700, fontFamily: '"Orbitron", monospace' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleStake}
                disabled={actionLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                sx={{
                  height: 56,
                  fontFamily: '"Orbitron", monospace',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  boxShadow: isDark ? `0 4px 15px ${alpha(primaryMain, 0.4)}` : 'none',
                }}
              >
                {actionLoading ? <CircularProgress size={24} color="inherit" /> : `STAKE · ${selectedAPR}% APR`}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Unstake + Claim ── */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 3, height: '100%', borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <LockOpenIcon sx={{ color: isLocked ? 'text.disabled' : primaryMain }} />
                <Typography variant="h6" fontWeight={700}>Withdraw Tokens</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500, lineHeight: 1.6, minHeight: 48 }}>
                {isLocked
                  ? `Your stake is currently locked for ${formatDuration(lockRemaining)} more. Unstake after the lock expires.`
                  : tokenStake && tokenStake.amount > 0
                    ? 'Your lock period has expired. You can now withdraw your principal tokens to your wallet.'
                    : 'No active stake found in this wallet.'}
              </Typography>
              {tokenStake && tokenStake.amount > 0 && !isLocked && (
                <Box sx={{ p: 2, mb: 3, bgcolor: isDark ? alpha(primaryMain, 0.05) : alpha(primaryMain, 0.03), borderRadius: 1.5, border: 1, borderColor: alpha(primaryMain, 0.2) }}>
                  <Typography variant="body2" sx={{ color: primaryMain, fontWeight: 700 }}>
                    Receiveable: {fmt(tokenStake.amount, 4)} GVT
                  </Typography>
                </Box>
              )}
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                size="large"
                onClick={handleUnstake}
                disabled={actionLoading || isLocked || !tokenStake || tokenStake.amount === 0}
                sx={{ fontWeight: 700, borderRadius: 1.5 }}
              >
                {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Unstake Tokens'}
              </Button>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 3, height: '100%', borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CardGiftcardIcon sx={{ color: liveRewards > 0 ? primaryMain : 'text.disabled' }} />
                <Typography variant="h6" fontWeight={700}>Claim Rewards</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500, lineHeight: 1.6, minHeight: 48 }}>
                {liveRewards > 0
                  ? `You have accumulated rewards ready to claim. Rewards can be claimed at any time without unstaking.`
                  : 'No rewards yet. Stake tokens to start earning governance incentives.'}
              </Typography>
              {liveRewards > 0 && (
                <Box sx={{ p: 2, mb: 3, bgcolor: isDark ? alpha(primaryMain, 0.05) : alpha(primaryMain, 0.03), borderRadius: 1.5, border: 1, borderColor: alpha(primaryMain, 0.2) }}>
                  <Typography variant="body2" sx={{ color: primaryMain, fontWeight: 800, fontFamily: '"Orbitron", monospace' }}>
                    Available: {fmt(liveRewards, 6)} GVT
                  </Typography>
                </Box>
              )}
              <Button
                variant="contained"
                color="success"
                fullWidth
                size="large"
                onClick={handleClaim}
                disabled={actionLoading || liveRewards === 0}
                sx={{ fontWeight: 700, borderRadius: 1.5, boxShadow: liveRewards > 0 && isDark ? `0 4px 15px ${alpha(theme.palette.success.main, 0.3)}` : 'none' }}
              >
                {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Claim Rewards'}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* ── Platform stats ── */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1.1rem' }}>
            Protocol Statistics
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: isDark ? alpha(primaryMain, 0.1) : alpha(primaryMain, 0.05), color: primaryMain }}>
                  <PaidIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Fees Collected</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {platformConfig ? fmt(platformConfig.totalFeesCollected, 2) : '0'} GVT
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: isDark ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.error.main, 0.05), color: theme.palette.error.main }}>
                  <LocalFireDepartmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Buyback &amp; Burned</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {platformConfig ? fmt(platformConfig.totalBurned, 2) : '0'} GVT
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: isDark ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.warning.main, 0.05), color: theme.palette.warning.main }}>
                  <PercentIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>Platform Fee</Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {platformConfig ? `${(platformConfig.feePercentage / 100).toFixed(2)}%` : '0%'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Transaction history (simulation only) ── */}
        {!isOnChain && history.length > 0 && (
          <Paper sx={{ p: 3, borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2.5 }}>
              Recent Activity
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {history.map((entry, i) => {
                const typeColor =
                  entry.type === 'stake'   ? secondaryMain :
                  entry.type === 'unstake' ? theme.palette.warning.main :
                  primaryMain;
                const typeLabel =
                  entry.type === 'stake'   ? '▲ STAKE' :
                  entry.type === 'unstake' ? '▼ WITHDRAW' :
                  '★ CLAIM';

                return (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50',
                      border: 1,
                      borderColor: 'divider',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'grey.100' }
                    }}
                  >
                    <Box sx={{ color: typeColor, fontWeight: 800, minWidth: 90 }}>
                      {typeLabel}
                    </Box>
                    <Box sx={{ color: 'text.primary', minWidth: 110, fontWeight: 700 }}>
                      {fmt(entry.amount, 4)} GVT
                    </Box>
                    <Box sx={{ color: 'text.secondary', flex: 1, fontWeight: 500 }}>
                      {new Date(entry.timestamp * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </Box>
                    <Tooltip title={entry.sig} arrow>
                      <Box sx={{ color: 'text.disabled', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'monospace', borderBottom: '1px dashed', borderColor: 'text.disabled' }}>
                        {shortSig(entry.sig)}
                      </Box>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        )}

      </Container>
    </Layout>
  );
}
