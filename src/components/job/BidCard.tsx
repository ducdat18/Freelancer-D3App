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
  const createdAt = new Date(bid.account.createdAt.toNumber() * 1000);
  const statusText = getBidStatusText(bid.account.status);
  const statusColor = getBidStatusColor(bid.account.status);
  const rankColor =
    rank === 1 ? '#FFD700' :
    rank === 2 ? '#C0C0C0' :
    rank === 3 ? '#CD7F32' :
    'rgba(255,255,255,0.15)';
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
        borderColor: rank <= 3 ? rankColor : undefined,
        borderWidth: rank === 1 ? 2 : 1,
        '&:hover': { boxShadow: 2 },
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
            background: rank <= 3 ? rankColor : 'rgba(255,255,255,0.08)',
            color: rank <= 3 ? '#000' : 'rgba(255,255,255,0.4)',
            border: `2px solid ${rankColor}`,
            fontFamily: '"Orbitron", monospace',
          }}>
            #{rank}
          </Box>
          <Box sx={{
            px: 0.75, py: 0.2, borderRadius: 0.75,
            bgcolor: scoreColor + '22',
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
              bgcolor: rank <= 3 ? rankColor : undefined,
              color: rank <= 3 ? '#000' : undefined,
            }}>
              {bid.account.freelancer.toBase58().slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Link href={`/profile/${bid.account.freelancer.toBase58()}`} passHref legacyBehavior>
                <MuiLink sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}>
                  {formatAddress(bid.account.freelancer)}
                </MuiLink>
              </Link>
              <Typography variant="caption" display="block" color="text.secondary">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </Typography>
            </Box>
          </Box>

          <Chip label={statusText} color={statusColor} size="small" />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Bid details: price + timeline side by side */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Bid Amount
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SolanaIconSimple sx={{ fontSize: 16 }} />
              <Typography variant="body1" fontWeight={600}>
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
                bgcolor: 'rgba(255,255,255,0.08)',
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
              bgcolor: 'background.default',
              borderRadius: 1,
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
                borderColor: 'rgba(128,132,238,0.4)', color: '#8084ee',
                '&:hover': { borderColor: '#8084ee', bgcolor: 'rgba(128,132,238,0.06)' },
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
