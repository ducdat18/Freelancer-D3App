import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Paper,
  Divider,
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
    <Paper sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Milestone Escrow
      </Typography>

      {/* Progress bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Progress
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {approvedCount} of {totalMilestones} complete
          </Typography>
        </Box>

        {/* Stacked progress bar */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 12,
            bgcolor: 'rgba(11,25,42,0.5)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Funded (blue) layer */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${fundedPercent}%`,
              bgcolor: '#8084ee',
              transition: 'width 0.5s ease',
            }}
          />
          {/* Released (cyan) layer on top */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${releasedPercent}%`,
              bgcolor: '#00ffc3',
              transition: 'width 0.5s ease',
            }}
          />
        </Box>

        {/* Legend */}
        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00ffc3' }} />
            <Typography variant="caption" color="text.secondary">
              Released
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#8084ee' }} />
            <Typography variant="caption" color="text.secondary">
              Funded
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'rgba(11,25,42,0.5)' }} />
            <Typography variant="caption" color="text.secondary">
              Unfunded
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Summary stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <AccountBalanceWallet sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={700}>
            {totalAmountSol.toFixed(4)} SOL
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Lock sx={{ fontSize: 18, color: '#00ffc3' }} />
            <Typography variant="caption" color="text.secondary">
              Locked
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={700} color="#00ffc3">
            {lockedAmountSol.toFixed(4)} SOL
          </Typography>
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <LockOpen sx={{ fontSize: 18, color: '#00ffc3' }} />
            <Typography variant="caption" color="text.secondary">
              Released
            </Typography>
          </Box>
          <Typography variant="body1" fontWeight={700} color="#00ffc3">
            {releasedAmountSol.toFixed(4)} SOL
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Milestone counts */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Lock sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {fundedCount} of {totalMilestones} funded
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
          <Typography variant="body2" color="text.secondary">
            {approvedCount} approved
          </Typography>
        </Box>
      </Box>

      {/* Completion message */}
      {approvedCount === totalMilestones && totalMilestones > 0 && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'success.light',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckCircle color="success" />
          <Typography variant="body2" fontWeight={600} color="success.dark">
            All milestones completed and funds released!
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
