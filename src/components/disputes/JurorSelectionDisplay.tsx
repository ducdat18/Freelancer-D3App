import { useState, useEffect, useCallback, useRef } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  HowToVote,
  Timer,
  CheckCircle,
  Person,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '../../types/solana';
import {
  useStakingDispute,
  type JurorSelectionData,
} from '../../hooks/useStakingDispute';

interface JurorSelectionDisplayProps {
  disputePda: PublicKey;
}

function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function JurorSelectionDisplay({ disputePda }: JurorSelectionDisplayProps) {
  const { publicKey } = useWallet();
  const { fetchJurorSelection } = useStakingDispute();

  const [selectionData, setSelectionData] = useState<JurorSelectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSelection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const selection = await fetchJurorSelection(disputePda);
      setSelectionData(selection);
    } catch (err: any) {
      console.error('Error loading juror selection:', err);
      setError('Failed to load juror selection data');
    } finally {
      setLoading(false);
    }
  }, [disputePda, fetchJurorSelection]);

  useEffect(() => {
    loadSelection();
  }, [loadSelection]);

  // Countdown timer
  useEffect(() => {
    if (!selectionData) return;

    const deadlineMs = selectionData.votingDeadline.toNumber() * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = deadlineMs - now;

      if (diff <= 0) {
        setTimeRemaining('Deadline passed');
        setDeadlinePassed(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      setDeadlinePassed(false);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeRemaining(parts.join(' '));
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectionData]);

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading jury selection data..."
        logs={[
          { text: 'PDA: JUROR_SELECTION seed=[dispute, round]', type: 'info' },
          { text: 'getAccountInfo(juror_selection_pda)...', type: 'info' },
          { text: 'Checking commitment hashes — reveal phase', type: 'info' },
          { text: 'Selection state decoded', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!selectionData) {
    return (
      <Alert severity="info">
        No juror selection found for this dispute. Jurors may not have been
        selected yet.
      </Alert>
    );
  }

  const totalJurors = selectionData.selectedJurors.length;
  const quorumRequired = Math.ceil(totalJurors * 0.5); // Simple majority
  const quorumProgress =
    quorumRequired > 0
      ? (selectionData.votesCast / quorumRequired) * 100
      : 0;

  const isCurrentUserSelected =
    publicKey &&
    selectionData.selectedJurors.some(
      (j) => j.toString() === publicKey.toString()
    );

  return (
    <Paper
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'rgba(0,255,195,0.05)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HowToVote color="primary" />
          <Typography variant="subtitle1" fontWeight={700}>
            Selected Jurors
          </Typography>
          <Chip
            label={`${totalJurors} jurors`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* Resolved Status */}
        {selectionData.resolved ? (
          <Chip
            label="Resolved"
            color="success"
            size="small"
            icon={<CheckCircle />}
          />
        ) : (
          <Chip
            label="Voting Active"
            color="warning"
            size="small"
            icon={<HowToVote />}
          />
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Voting Deadline Countdown */}
        {!selectionData.resolved && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              mb: 2,
              borderRadius: 1.5,
              bgcolor: deadlinePassed
                ? 'rgba(255,0,255,0.08)'
                : 'rgba(224,77,1,0.08)',
              border: '1px solid',
              borderColor: deadlinePassed
                ? 'rgba(255,0,255,0.3)'
                : 'rgba(224,77,1,0.3)',
            }}
          >
            <Timer
              fontSize="small"
              sx={{ color: deadlinePassed ? 'error.main' : 'warning.main' }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Voting Deadline
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  color: deadlinePassed ? 'error.main' : 'warning.main',
                  fontFamily: 'monospace',
                }}
              >
                {timeRemaining}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Quorum Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Votes Cast
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {selectionData.votesCast} / {totalJurors}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(quorumProgress, 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: selectionData.quorumMet
                  ? 'linear-gradient(90deg, #00ffc3, #00ffc3)'
                  : 'linear-gradient(90deg, #8084ee, #a5a8f3)',
              },
            }}
          />
          {selectionData.quorumMet && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
              <Typography variant="caption" color="success.main" fontWeight={600}>
                Quorum reached
              </Typography>
            </Box>
          )}
        </Box>

        {/* Current user indicator */}
        {isCurrentUserSelected && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have been selected as a juror for this dispute.
          </Alert>
        )}

        {/* Juror List */}
        <List disablePadding>
          {selectionData.selectedJurors.map((juror, index) => {
            const jurorAddress = juror.toString();
            const isCurrentUser =
              publicKey && jurorAddress === publicKey.toString();

            return (
              <ListItem
                key={jurorAddress}
                sx={{
                  px: 1.5,
                  py: 1,
                  mb: 0.5,
                  borderRadius: 1.5,
                  bgcolor: isCurrentUser
                    ? 'rgba(0,255,195,0.1)'
                    : 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid',
                  borderColor: isCurrentUser
                    ? 'rgba(0,255,195,0.3)'
                    : 'transparent',
                }}
              >
                <Person
                  sx={{
                    fontSize: 20,
                    mr: 1.5,
                    color: isCurrentUser ? 'primary.main' : 'text.secondary',
                  }}
                />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight={isCurrentUser ? 700 : 400}
                        sx={{
                          color: isCurrentUser ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {truncateAddress(jurorAddress)}
                      </Typography>
                      {isCurrentUser && (
                        <Chip label="You" size="small" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={`Juror #${index + 1}`}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Paper>
  );
}
