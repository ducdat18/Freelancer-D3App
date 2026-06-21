import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import type { PublicKey } from '../../types/solana';
import { useMilestones } from '../../hooks/useMilestones';
import type { MilestoneData } from '../../hooks/useMilestones';
import MilestoneCard from './MilestoneCard';

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

interface MilestoneTimelineProps {
  jobPda: PublicKey;
  isClient: boolean;
  isFreelancer: boolean;
  freelancerPubkey?: PublicKey;
}

export default function MilestoneTimeline({
  jobPda,
  isClient,
  isFreelancer,
  freelancerPubkey,
}: MilestoneTimelineProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const STATUS_COLORS: Record<MilestoneStatusKey, string> = {
    pending: theme.palette.text.disabled,
    funded: theme.palette.primary.main,
    inProgress: theme.palette.warning.main,
    submitted: theme.palette.info.main,
    approved: theme.palette.success.main,
    rejected: theme.palette.error.main,
    disputed: theme.palette.error.main,
    cancelled: theme.palette.text.disabled,
  };

  const { fetchAllMilestones, fetchMilestoneConfig } = useMilestones();

  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [totalMilestones, setTotalMilestones] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const config = await fetchMilestoneConfig(jobPda);
      if (config) {
        setTotalMilestones(config.totalMilestones);
      }

      const data = await fetchAllMilestones(jobPda);
      setMilestones(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  }, [jobPda, fetchAllMilestones, fetchMilestoneConfig]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading milestones..."
        logs={[
          { text: 'PDA: JOB_CONFIG seed=[job-config, job_pda]', type: 'info' },
          { text: 'gPA filter: MILESTONE[job_pda] accounts...', type: 'info' },
          { text: 'Decoding MilestoneData structs...', type: 'info' },
          { text: 'Sorted by milestone_index ASC', type: 'ok' },
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

  if (milestones.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No milestones have been created for this job yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          Milestones
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {milestones.length} of {totalMilestones} milestones created
        </Typography>
      </Box>

      {/* Vertical timeline */}
      <Box sx={{ position: 'relative' }}>
        {milestones.map((milestone, index) => {
          const statusKey = getStatusKey(milestone.status);
          const color = STATUS_COLORS[statusKey] || theme.palette.text.disabled;
          const isLast = index === milestones.length - 1;

          return (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: isLast ? 0 : 3 }}>
              {/* Timeline connector */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  width: 24,
                }}
              >
                {/* Dot */}
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: '2px solid',
                    borderColor: theme.palette.background.paper,
                    boxShadow: isDark ? `0 0 8px ${color}60` : `0 0 0 2px ${color}30`,
                    flexShrink: 0,
                    mt: 1.5,
                  }}
                />
                {/* Line */}
                {!isLast && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      bgcolor: statusKey === 'approved' ? 'success.main' : 'divider',
                      mt: 0.5,
                    }}
                  />
                )}
              </Box>

              {/* Milestone card */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <MilestoneCard
                  milestone={milestone}
                  milestoneIndex={index}
                  jobPda={jobPda}
                  isClient={isClient}
                  isFreelancer={isFreelancer}
                  freelancerPubkey={freelancerPubkey}
                  onRefresh={loadMilestones}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
