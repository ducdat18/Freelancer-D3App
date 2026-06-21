import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  useTheme,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  Lock,
  LockOpen,
  CheckCircle,
  AccountBalanceWallet,
} from '@mui/icons-material';
import type { PublicKey } from '../../types/solana';
import { lamportsToSol } from '../../types/solana';
import { useMilestones } from '../../hooks/useMilestones';
import type { MilestoneData, MilestoneConfigData } from '../../hooks/useMilestones';

type MilestoneStatusKey =
  | 'pending'
  | 'funded'
  | 'inProgress'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'disputed'
  | 'cancelled';

function getStatusKey(status: Record<string, unknown>): MilestoneStatusKey {
  const keys = Object.keys(status);
  if (keys.length === 0) return 'pending';
  const key = keys[0].toLowerCase();
  if (key === 'inprogress' || key === 'in_progress') return 'inProgress';
  return key as MilestoneStatusKey;
}

interface MilestoneEscrowStatusProps {
  jobPda: PublicKey;
}

export default function MilestoneEscrowStatus({ jobPda }: MilestoneEscrowStatusProps) {
  const { fetchMilestoneConfig, fetchAllMilestones } = useMilestones();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const [config, setConfig] = useState<MilestoneConfigData | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [configData, milestonesData] = await Promise.all([
        fetchMilestoneConfig(jobPda),
        fetchAllMilestones(jobPda),
      ]);

      setConfig(configData);
      setMilestones(milestonesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load milestone escrow status');
    } finally {
      setLoading(false);
    }
  }, [jobPda, fetchMilestoneConfig, fetchAllMilestones]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading escrow status..."
        logs={[
          { text: 'PDA: MS_ESCROW seed=[ms-escrow, job, idx]', type: 'info' },
          { text: 'getAccountInfo(ms_escrow_pda)...', type: 'info' },
          { text: 'Decoding locked lamports → SOL', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!config || milestones.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No milestone data available.
        </Typography>
      </Box>
    );
  }

  // Compute aggregates
  const totalMilestones = config.totalMilestones;
  const totalAmountLamports = milestones.reduce(
    (sum, m) => sum + m.amount.toNumber(),
    0
  );
  const totalAmountSol = lamportsToSol(totalAmountLamports);

  const fundedMilestones = milestones.filter((m) => {
    const key = getStatusKey(m.status);
    return key !== 'pending' && key !== 'cancelled';
  });
  const fundedCount = fundedMilestones.length;

  const approvedMilestones = milestones.filter(
    (m) => getStatusKey(m.status) === 'approved'
  );
  const approvedCount = approvedMilestones.length;

  const releasedAmountLamports = approvedMilestones.reduce(
    (sum, m) => sum + m.amount.toNumber(),
    0
  );
  const releasedAmountSol = lamportsToSol(releasedAmountLamports);

  const lockedAmountLamports = fundedMilestones
    .filter((m) => getStatusKey(m.status) !== 'approved')
    .reduce((sum, m) => sum + m.amount.toNumber(), 0);
  const lockedAmountSol = lamportsToSol(lockedAmountLamports);

  const fundedPercent = totalAmountLamports > 0
    ? (fundedMilestones.reduce((s, m) => s + m.amount.toNumber(), 0) / totalAmountLamports) * 100
    : 0;
  const releasedPercent = totalAmountLamports > 0
    ? (releasedAmountLamports / totalAmountLamports) * 100
    : 0;

  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1rem' }}>
        Milestone Escrow
      </Typography>

      {/* Progress bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Progress
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {approvedCount} of {totalMilestones} complete
          </Typography>
        </Box>

        {/* Stacked progress bar */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 12,
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            borderRadius: 2,
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
          }}
        >
          {/* Funded layer */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${fundedPercent}%`,
              bgcolor: secondaryMain,
              opacity: 0.6,
              transition: 'width 0.5s ease',
            }}
          />
          {/* Released layer on top */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${releasedPercent}%`,
              bgcolor: primaryMain,
              transition: 'width 0.5s ease',
              boxShadow: isDark ? `0 0 10px ${primaryMain}40` : 'none',
            }}
          />
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 2.5, mt: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: primaryMain }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Released
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: secondaryMain, opacity: 0.6 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Funded
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Unfunded
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2.5 }} />

      {/* Summary stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2.5 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <AccountBalanceWallet sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
              TOTAL
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={800}>
            {totalAmountSol.toFixed(4)} SOL
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <Lock sx={{ fontSize: 16, color: primaryMain }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
              LOCKED
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={800} color="primary.main">
            {lockedAmountSol.toFixed(4)} SOL
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <LockOpen sx={{ fontSize: 16, color: primaryMain }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
              RELEASED
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={800} color="primary.main">
            {releasedAmountSol.toFixed(4)} SOL
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2.5 }} />

      {/* Milestone counts */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {fundedCount} of {totalMilestones} funded
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {approvedCount} approved
          </Typography>
        </Box>
      </Box>

      {/* Completion message */}
      {approvedCount === totalMilestones && totalMilestones > 0 && (
        <Box
          sx={{
            mt: 2.5,
            p: 1.5,
            bgcolor: isDark ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.05)',
            borderRadius: 1.5,
            border: 1,
            borderColor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckCircle color="success" sx={{ fontSize: 18 }} />
          <Typography variant="caption" fontWeight={700} color="success.main" sx={{ textTransform: 'uppercase' }}>
            Mission Complete: All funds released
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
