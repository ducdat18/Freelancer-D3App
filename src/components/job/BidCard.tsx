import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  Alert,
  Divider,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Visibility,
  Chat,
  Psychology,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { getBidStatusText, getBidStatusColor, type BidWithDetails } from '../../hooks/useOptimizedBids';
import { SolanaIconSimple } from '../SolanaIcon';
import Link from 'next/link';
import MuiLink from '@mui/material/Link';
import { getCleanProposal } from '../../utils/cvUtils';
import { SCORE_COLORS, getScoreLevel } from '../../utils/bidScore';

interface BidCardProps {
  bid: BidWithDetails;
  rank: number;
  score: number;
  jobBudgetSol?: number;
  isClient: boolean;
  onAccept: (bid: BidWithDetails) => void;
  onViewProposal: (bid: BidWithDetails) => void;
  onViewCV: (cvUri: string, addr: string) => void;
  onRiskCheck: (bid: BidWithDetails) => void;
  onChat: (addr: string) => void;
}

export default function BidCard({
  bid,
  rank,
  score,
  jobBudgetSol = 0,
  isClient,
  onAccept,
  onViewProposal,
  onViewCV,
  onRiskCheck,
  onChat,
}: BidCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const createdAt = new Date(bid.account.createdAt.toNumber() * 1000);
  const statusText = getBidStatusText(bid.account.status);
  const statusColor = getBidStatusColor(bid.account.status);
  
  // High contrast rank colors
  const rankColor =
    rank === 1 ? (isDark ? '#FFD700' : '#B8860B') : // Gold
    rank === 2 ? (isDark ? '#C0C0C0' : '#708090') : // Silver
    rank === 3 ? (isDark ? '#CD7F32' : '#8B4513') : // Bronze
    'divider';
    
  const scoreLevel = getScoreLevel(score);
  const scoreColor = SCORE_COLORS[scoreLevel];

  const formatAddress = (address: any) => {
    const addr = address.toBase58();
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        borderColor: rank <= 3 ? rankColor : 'divider',
        borderWidth: rank === 1 ? 2 : 1,
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: isDark ? `0 0 20px ${theme.palette.primary.main}10` : '0 4px 12px rgba(0,0,0,0.05)' },
      }}
    >
      <CardContent>
        {/* Rank badge + score */}
        <Box sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
        }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.75rem',
            background: rank <= 3 ? rankColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
            color: rank <= 3 ? '#fff' : 'text.disabled',
            border: rank <= 3 ? `2px solid ${rankColor}` : `1px solid ${theme.palette.divider}`,
            fontFamily: '"Orbitron", monospace',
          }}>
            #{rank}
          </Box>
          <Box sx={{
            px: 0.75, py: 0.2, borderRadius: 0.75,
            bgcolor: scoreColor + (isDark ? '22' : '15'),
            border: `1px solid ${scoreColor}55`,
            fontSize: '0.6rem', fontWeight: 700,
            color: scoreColor, fontFamily: 'monospace',
            letterSpacing: '0.04em',
          }}>
            {score}/100
          </Box>
        </Box>

        {/* Header: Freelancer info and status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2, pr: 7 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{
              width: 48, height: 48,
              bgcolor: rank <= 3 ? rankColor : theme.palette.primary.main,
              color: '#fff',
            }}>
              {bid.account.freelancer.toBase58().slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Link href={`/profile/${bid.account.freelancer.toBase58()}`} passHref legacyBehavior>
                <MuiLink sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: 'primary.main' }}>
                  {formatAddress(bid.account.freelancer)}
                </MuiLink>
              </Link>
              <Typography variant="caption" display="block" color="text.secondary">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </Typography>
            </Box>
          </Box>

          <Chip label={statusText} color={statusColor} size="small" variant={isDark ? 'filled' : 'outlined'} />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Bid details: price + timeline side by side */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Bid Amount
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SolanaIconSimple sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography variant="body1" fontWeight={700} color="primary.main">
                {bid.budgetInSol.toFixed(4)}
              </Typography>
              {jobBudgetSol > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                  ({Math.round((bid.budgetInSol / jobBudgetSol) * 100)}% of budget)
                </Typography>
              )}
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Timeline
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {bid.account.timelineDays} day{bid.account.timelineDays !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>

        {/* Competitiveness score bar */}
        {jobBudgetSol > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Competitiveness Score
              </Typography>
              <Typography variant="caption" sx={{ color: scoreColor, fontWeight: 700 }}>
                {score}/100
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={score}
              sx={{
                height: 4, borderRadius: 2,
                bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 2 },
              }}
            />
          </Box>
        )}

        {/* Proposal */}
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Proposal
          </Typography>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'pre-line',
              maxHeight: 150,
              overflow: 'auto',
              p: 1.5,
              bgcolor: isDark ? 'background.default' : 'grey.50',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              color: 'text.primary',
            }}
          >
            {getCleanProposal(bid.account.proposal)}
          </Typography>
        </Box>

        {/* Actions for client */}
        {isClient && statusText === 'Pending' && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => onAccept(bid)}
              sx={{ flex: '1 1 auto' }}
            >
              Accept Bid
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Visibility />}
              onClick={() => onViewProposal(bid)}
              sx={{ flex: '0 1 auto', minWidth: '110px' }}
            >
              Full Proposal
            </Button>
            {bid.account.cvUri && bid.account.cvUri.trim() !== '' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Visibility />}
                onClick={() => onViewCV(bid.account.cvUri, formatAddress(bid.account.freelancer))}
                sx={{ flex: '0 1 auto', minWidth: '100px' }}
              >
                View CV
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Psychology />}
              onClick={() => onRiskCheck(bid)}
              sx={{
                flex: '0 1 auto', minWidth: '110px',
                borderColor: isDark ? 'rgba(128,132,238,0.4)' : 'secondary.light',
                color: 'secondary.main',
                '&:hover': { borderColor: 'secondary.main', bgcolor: isDark ? 'rgba(128,132,238,0.06)' : 'rgba(99,102,241,0.04)' },
              }}
            >
              Risk Check
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Chat />}
              onClick={() => onChat(bid.account.freelancer.toBase58())}
              sx={{ flex: '0 1 auto', minWidth: '100px' }}
            >
              Message
            </Button>
          </Box>
        )}

        {/* Show accepted indicator with message button */}
        {statusText === 'Accepted' && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 1 }}>
              This bid has been accepted!
            </Alert>
            {isClient && (
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<Chat />}
                onClick={() => onChat(bid.account.freelancer.toBase58())}
              >
                Message Freelancer
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
