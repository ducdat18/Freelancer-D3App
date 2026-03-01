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
  const aprPct = Math.round(config.apr * 100);
  const aprColor =
    aprPct >= 40 ? '#00ffc3' :
    aprPct >= 20 ? '#8084ee' :
    aprPct >= 10 ? '#e04d01' :
    'rgba(255,255,255,0.5)';

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: selected ? aprColor : 'rgba(255,255,255,0.1)',
        background: selected
          ? `${aprColor}11`
          : 'rgba(255,255,255,0.02)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'center',
        '&:hover': {
          borderColor: selected ? aprColor : 'rgba(255,255,255,0.25)',
          background: selected ? `${aprColor}18` : 'rgba(255,255,255,0.04)',
        },
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
        {config.label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={800}
        sx={{ color: selected ? aprColor : 'text.secondary', fontFamily: '"Orbitron", monospace' }}
      >
        {aprPct}%
      </Typography>
      <Typography variant="caption" color="text.secondary">
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
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Token Staking
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Stake GVT governance tokens to earn rewards and participate in platform decisions.
            </Typography>
          </Box>
          {/* Simulation badge */}
          {!isOnChain && (
            <Chip
              icon={<ScienceIcon />}
              label="DEVNET SIMULATION"
              size="small"
              sx={{
                fontFamily: '"Orbitron", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.08em',
                bgcolor: 'rgba(224,77,1,0.15)',
                color: '#e04d01',
                border: '1px solid rgba(224,77,1,0.35)',
              }}
            />
          )}
        </Box>

        {/* Simulation notice */}
        {!isOnChain && (
          <Alert
            severity="info"
            icon={<ScienceIcon />}
            sx={{ mb: 3, borderColor: 'rgba(128,132,238,0.4)', bgcolor: 'rgba(128,132,238,0.07)' }}
          >
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Devnet Simulation Mode
            </Typography>
            <Typography variant="body2">
              Staking is simulated locally (localStorage) since the on-chain staking program is not yet deployed.
              All state persists across page reloads. Rewards accrue in real-time. Tx signatures are synthetic.
            </Typography>
          </Alert>
        )}

        {/* Alerts */}
        {successMessage && (
          <Alert
            severity="success"
            sx={{ mb: 3, whiteSpace: 'pre-line' }}
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}
        {error && !successMessage && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* ── Stats cards ── */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {/* Total Staked */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 2.5, textAlign: 'center',
              border: '1px solid rgba(0,255,195,0.15)',
              background: 'linear-gradient(135deg, rgba(0,255,195,0.05) 0%, transparent 100%)',
            }}>
              <LockIcon sx={{ fontSize: 36, color: '#00ffc3', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">Total Staked</Typography>
              <Typography variant="h6" fontWeight={700} fontFamily='"Orbitron", monospace'>
                {platformConfig ? fmt(platformConfig.totalStaked, 2) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">GVT</Typography>
            </Paper>
          </Grid>

          {/* Your Stake */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 2.5, textAlign: 'center',
              border: '1px solid rgba(128,132,238,0.2)',
              background: 'linear-gradient(135deg, rgba(128,132,238,0.05) 0%, transparent 100%)',
            }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 36, color: '#8084ee', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">Your Stake</Typography>
              <Typography variant="h6" fontWeight={700} fontFamily='"Orbitron", monospace'>
                {tokenStake ? fmt(tokenStake.amount, 2) : '0.00'}
              </Typography>
              <Typography variant="caption" color="text.secondary">GVT</Typography>
              {tokenStake && tokenStake.amount > 0 && (
                <Chip label={`${stakedAPR}% APR`} size="small"
                  sx={{ mt: 0.5, fontSize: '0.65rem', bgcolor: 'rgba(128,132,238,0.15)', color: '#8084ee' }} />
              )}
            </Paper>
          </Grid>

          {/* Live Rewards */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 2.5, textAlign: 'center',
              border: '1px solid rgba(0,255,195,0.15)',
              background: 'linear-gradient(135deg, rgba(0,255,127,0.05) 0%, transparent 100%)',
            }}>
              <CardGiftcardIcon sx={{ fontSize: 36, color: '#00ffc3', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                Live Rewards
                {tokenStake && tokenStake.amount > 0 && (
                  <Box component="span" sx={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    bgcolor: '#00ffc3', ml: 0.75, mb: '1px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                    },
                  }} />
                )}
              </Typography>
              <Typography variant="h6" fontWeight={700} fontFamily='"Orbitron", monospace' sx={{ color: '#00ffc3' }}>
                {fmt(liveRewards, 6)}
              </Typography>
              <Typography variant="caption" color="text.secondary">GVT</Typography>
            </Paper>
          </Grid>

          {/* Lock Remaining */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{
              p: 2.5, textAlign: 'center',
              border: '1px solid rgba(255,165,0,0.15)',
              background: 'linear-gradient(135deg, rgba(255,165,0,0.05) 0%, transparent 100%)',
            }}>
              <TimerIcon sx={{ fontSize: 36, color: 'warning.main', mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary" display="block">Lock Remaining</Typography>
              <Typography variant="h6" fontWeight={700} fontFamily='"Orbitron", monospace'>
                {formatDuration(lockRemaining)}
              </Typography>
              {tokenStake && tokenStake.amount > 0 && (
                <Box sx={{ mt: 1, px: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={lockProgress}
                    sx={{
                      height: 3, borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.08)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isLocked ? 'warning.main' : '#00ffc3',
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    {Math.round(lockProgress)}% elapsed
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── Current stake info (if staked) ── */}
        {tokenStake && tokenStake.amount > 0 && (
          <Paper sx={{ p: 3, mb: 4, border: '1px solid rgba(0,255,195,0.12)' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Active Position
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Staked Since</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {new Date(tokenStake.stakedAt * 1000).toLocaleDateString()} ({formatDistanceToNow(new Date(tokenStake.stakedAt * 1000), { addSuffix: true })})
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Unlock Date</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {isLocked
                    ? new Date(tokenStake.lockUntil * 1000).toLocaleDateString()
                    : <Box component="span" sx={{ color: '#00ffc3' }}>Unlocked ✓</Box>
                  }
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Daily Reward Rate</Typography>
                <Typography variant="body1" fontWeight={600} sx={{ color: '#00ffc3' }}>
                  +{fmt(getLiveAccrualPerSecond(tokenStake) * 86400, 4)} GVT/day
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* ── Stake form ── */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Stake Tokens
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose a lock period and enter an amount. Longer lock periods yield higher APR.
            {!isOnChain && ' In simulation mode you can enter any amount.'}
          </Typography>

          {/* Lock period cards */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Lock Period
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
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
          <Grid container spacing={2} alignItems="flex-end">
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField
                fullWidth
                label="Amount (GVT)"
                type="number"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                placeholder="0.00"
                inputProps={{ min: 0, step: 'any' }}
                disabled={actionLoading}
                helperText={
                  stakeAmount && parseFloat(stakeAmount) > 0
                    ? `Estimated daily reward: +${estDailyReward.toFixed(4)} GVT/day · Monthly: +${(estDailyReward * 30).toFixed(4)} GVT`
                    : 'Enter an amount to see estimated rewards'
                }
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
                  fontSize: '0.8rem',
                  letterSpacing: '0.05em',
                }}
              >
                {actionLoading ? 'Processing...' : `Stake · ${selectedAPR}% APR`}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Unstake + Claim ── */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockOpenIcon sx={{ color: isLocked ? 'text.disabled' : '#00ffc3' }} />
                <Typography variant="h6" fontWeight={600}>Unstake</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isLocked
                  ? `Locked for ${formatDuration(lockRemaining)} more. Unstake after lock expires.`
                  : tokenStake && tokenStake.amount > 0
                    ? 'Your lock period has expired. You can withdraw your tokens.'
                    : 'No active stake.'}
              </Typography>
              {tokenStake && tokenStake.amount > 0 && !isLocked && (
                <Typography variant="body2" sx={{ color: '#00ffc3', mb: 2 }}>
                  You will receive {fmt(tokenStake.amount, 4)} GVT back.
                </Typography>
              )}
              <Button
                variant="outlined"
                color="warning"
                fullWidth
                onClick={handleUnstake}
                disabled={actionLoading || isLocked || !tokenStake || tokenStake.amount === 0}
              >
                {actionLoading ? 'Processing...' : 'Unstake Tokens'}
              </Button>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CardGiftcardIcon sx={{ color: liveRewards > 0 ? '#00ffc3' : 'text.disabled' }} />
                <Typography variant="h6" fontWeight={600}>Claim Rewards</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {liveRewards > 0
                  ? `You have accumulated rewards ready to claim.`
                  : 'No rewards yet. Stake tokens to start earning.'}
              </Typography>
              {liveRewards > 0 && (
                <Typography variant="body2" sx={{ color: '#00ffc3', mb: 2, fontFamily: '"Orbitron", monospace', fontSize: '0.85rem' }}>
                  {fmt(liveRewards, 6)} GVT
                </Typography>
              )}
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleClaim}
                disabled={actionLoading || liveRewards === 0}
              >
                {actionLoading ? 'Processing...' : 'Claim Rewards'}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* ── Platform stats ── */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Platform Statistics
          </Typography>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PaidIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Total Fees Collected</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {platformConfig ? fmt(platformConfig.totalFeesCollected, 2) : '0'} GVT
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LocalFireDepartmentIcon sx={{ color: 'error.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Buyback &amp; Burned</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {platformConfig ? fmt(platformConfig.totalBurned, 2) : '0'} GVT
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <PercentIcon sx={{ color: 'warning.main' }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Platform Fee</Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {platformConfig ? `${(platformConfig.feePercentage / 100).toFixed(2)}%` : '0%'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* ── Transaction history (simulation only) ── */}
        {!isOnChain && history.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Transaction History
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {history.map((entry, i) => {
                const typeColor =
                  entry.type === 'stake'   ? '#8084ee' :
                  entry.type === 'unstake' ? '#e04d01' :
                  '#00ffc3';
                const typeLabel =
                  entry.type === 'stake'   ? '▲ STAKE' :
                  entry.type === 'unstake' ? '▼ UNSTAKE' :
                  '★ CLAIM';

                return (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                    }}
                  >
                    <Box sx={{ color: typeColor, fontWeight: 700, minWidth: 80 }}>
                      {typeLabel}
                    </Box>
                    <Box sx={{ color: typeColor, minWidth: 100 }}>
                      {fmt(entry.amount, 4)} GVT
                    </Box>
                    <Box sx={{ color: 'text.secondary', flex: 1 }}>
                      {new Date(entry.timestamp * 1000).toLocaleString()}
                    </Box>
                    <Tooltip title={entry.sig}>
                      <Box sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', cursor: 'default' }}>
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
