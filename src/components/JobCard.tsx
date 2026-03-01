import {
  Card, CardContent, CardActions, Typography, Chip, Button, Box,
} from '@mui/material';
import { useRouter } from 'next/router';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { JobData } from '../hooks/useJobs';
import { lamportsToSol, bnToNumber } from '../types/solana';
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
    open:       { label: 'Open',        color: '#4caf50', bg: 'rgba(76,175,80,0.1)',   border: 'rgba(76,175,80,0.25)' },
    inProgress: { label: 'In Progress', color: '#2196f3', bg: 'rgba(33,150,243,0.1)',  border: 'rgba(33,150,243,0.25)' },
    completed:  { label: 'Completed',   color: '#9e9e9e', bg: 'rgba(158,158,158,0.1)', border: 'rgba(158,158,158,0.2)' },
    disputed:   { label: 'Disputed',    color: '#f44336', bg: 'rgba(244,67,54,0.1)',   border: 'rgba(244,67,54,0.25)' },
    cancelled:  { label: 'Cancelled',   color: '#ff9800', bg: 'rgba(255,152,0,0.1)',   border: 'rgba(255,152,0,0.25)' },
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
        border: '1px solid rgba(0,255,195,0.08)',
        transition: 'all 0.22s ease',
        cursor: 'pointer',
        '&:hover': {
          borderColor: 'rgba(0,255,195,0.22)',
          boxShadow: '0 0 28px rgba(0,255,195,0.06)',
          transform: 'translateY(-3px)',
        },
      }}
      onClick={() => router.push(`/jobs/${job.publicKey.toBase58()}`)}
    >
      <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
        {/* Status + budget row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box
            sx={{
              px: 1.25, py: 0.35,
              borderRadius: 1,
              bgcolor: st.bg,
              border: `1px solid ${st.border}`,
              color: st.color,
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {st.label}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SolanaIconSimple sx={{ fontSize: 14, color: '#00ffc3' }} />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ fontFamily: '"Orbitron", sans-serif', color: '#00ffc3', fontSize: '0.85rem' }}
            >
              {budgetSol.toFixed(2)}
            </Typography>
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle1"
          fontWeight={700}
          gutterBottom
          sx={{ lineHeight: 1.3, mb: 1 }}
        >
          {jobData.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, lineHeight: 1.6, fontSize: '0.82rem' }}
        >
          {truncated}
        </Typography>

        {/* Meta row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{postedDate}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {clientShort}
          </Typography>
          <Chip
            label={`${jobData.bidCount} ${jobData.bidCount === 1 ? 'bid' : 'bids'}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20 }}
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
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
