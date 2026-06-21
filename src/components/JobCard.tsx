import {
  Card, CardContent, CardActions, Typography, Chip, Button, Box, useTheme, alpha,
} from '@mui/material';
import { useRouter } from 'next/router';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { JobData } from '../hooks/useJobs';
import { lamportsToSol, bnToNumber, formatSol } from '../types/solana';
import { JOB_STATUS } from '../config/constants';
import type { PublicKey } from '../types/solana';
import { SolanaIconSimple } from './SolanaIcon';

interface JobCardProps {
  job: {
    publicKey: PublicKey;
    account: JobData;
  };
}

export default function JobCard({ job }: JobCardProps) {
  const jobData = job.account;
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const getStatusKey = (status: any): string => {
    if (typeof status === 'object') return Object.keys(status)[0];
    if (status === JOB_STATUS.OPEN) return 'open';
    if (status === JOB_STATUS.IN_PROGRESS) return 'inProgress';
    if (status === JOB_STATUS.COMPLETED) return 'completed';
    if (status === JOB_STATUS.DISPUTED) return 'disputed';
    return 'cancelled';
  };

  const statusKey = getStatusKey(jobData.status);
  
  const statusStyles: Record<string, { label: string; color: string; bg: string; border: string }> = {
    open: { 
      label: 'Open', 
      color: theme.palette.success.main, 
      bg: isDark ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.success.main, 0.05),
      border: alpha(theme.palette.success.main, 0.3)
    },
    inProgress: { 
      label: 'In Progress', 
      color: theme.palette.info.main, 
      bg: isDark ? alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.info.main, 0.05),
      border: alpha(theme.palette.info.main, 0.3)
    },
    completed: { 
      label: 'Completed', 
      color: theme.palette.text.disabled, 
      bg: isDark ? alpha(theme.palette.text.disabled, 0.1) : alpha(theme.palette.text.disabled, 0.05),
      border: alpha(theme.palette.text.disabled, 0.2)
    },
    disputed: { 
      label: 'Disputed', 
      color: theme.palette.error.main, 
      bg: isDark ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.error.main, 0.05),
      border: alpha(theme.palette.error.main, 0.3)
    },
    cancelled: { 
      label: 'Cancelled', 
      color: theme.palette.warning.main, 
      bg: isDark ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.warning.main, 0.05),
      border: alpha(theme.palette.warning.main, 0.3)
    },
  };
  
  const st = statusStyles[statusKey] ?? statusStyles.open;

  const budgetSol = lamportsToSol(bnToNumber(jobData.budget));
  const postedDate = new Date(bnToNumber(jobData.createdAt) * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
  const truncated = jobData.description.length > 110
    ? jobData.description.slice(0, 110) + '...'
    : jobData.description;
  const clientAddr = jobData.client.toBase58();
  const clientShort = `${clientAddr.slice(0, 4)}...${clientAddr.slice(-4)}`;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        transition: 'all 0.22s ease',
        cursor: 'pointer',
        backgroundImage: 'none',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: isDark 
            ? `0 0 28px ${alpha(theme.palette.primary.main, 0.1)}` 
            : '0 4px 20px rgba(0,0,0,0.05)',
          transform: 'translateY(-3px)',
        },
      }}
      onClick={() => router.push(`/jobs/${job.publicKey.toBase58()}`)}
    >
      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        {/* Status + budget row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              px: 1.25, py: 0.35,
              borderRadius: 1,
              bgcolor: st.bg,
              border: 1,
              borderColor: st.border,
              color: st.color,
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
            {st.label}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SolanaIconSimple sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography
              variant="subtitle2"
              fontWeight={800}
              sx={{ fontFamily: '"Orbitron", sans-serif', color: 'primary.main', fontSize: '0.85rem' }}
            >
              {formatSol(budgetSol)}
            </Typography>
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle1"
          fontWeight={700}
          gutterBottom
          sx={{ lineHeight: 1.3, mb: 1, color: 'text.primary' }}
        >
          {jobData.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2.5, lineHeight: 1.6, fontSize: '0.82rem', fontWeight: 500 }}
        >
          {truncated}
        </Typography>

        {/* Meta row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{postedDate}</Typography>
          </Box>
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {clientShort}
          </Typography>
          <Chip
            label={`${jobData.bidCount} ${jobData.bidCount === 1 ? 'bid' : 'bids'}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700, borderColor: 'divider' }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          endIcon={<ArrowForwardIcon />}
          onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.publicKey.toBase58()}`); }}
          sx={{ fontWeight: 700 }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
