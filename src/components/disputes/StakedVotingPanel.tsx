import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  HowToVote,
  Warning,
  CheckCircle,
  HourglassBottom,
  Person,
  Work,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '../../types/solana';
import {
  useStakingDispute,
  type JurorSelectionData,
  type JurorStakeData,
  type StakedVoteRecordData,
} from '../../hooks/useStakingDispute';

interface StakedVotingPanelProps {
  disputePda: PublicKey;
  clientPubkey: PublicKey;
  freelancerPubkey: PublicKey;
}

export default function StakedVotingPanel({
  disputePda,
  clientPubkey,
  freelancerPubkey,
}: StakedVotingPanelProps) {
  const { publicKey } = useWallet();
  const {
    castStakedVote,
    fetchJurorSelection,
    fetchJurorStake,
    fetchStakedVote,
  } = useStakingDispute();

  const [selectionData, setSelectionData] = useState<JurorSelectionData | null>(null);
  const [stakeData, setStakeData] = useState<JurorStakeData | null>(null);
  const [voteRecord, setVoteRecord] = useState<StakedVoteRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const warningMain = theme.palette.warning.main;

  const isSelected =
    publicKey &&
    selectionData?.selectedJurors.some(
      (j) => j.toString() === publicKey.toString()
    );

  const hasVoted = voteRecord !== null;

  const deadlinePassed =
    selectionData
      ? Date.now() > selectionData.votingDeadline.toNumber() * 1000
      : false;

  const isDisabled = !isSelected || hasVoted || deadlinePassed || selectionData?.resolved;

  const loadData = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [selection, stake, vote] = await Promise.all([
        fetchJurorSelection(disputePda),
        fetchJurorStake(publicKey),
        fetchStakedVote(disputePda, publicKey),
      ]);
      setSelectionData(selection);
      setStakeData(stake);
      setVoteRecord(vote);
    } catch (err: any) {
      console.error('Error loading voting data:', err);
      setError('Failed to load voting data');
    } finally {
      setLoading(false);
    }
  }, [publicKey, disputePda, fetchJurorSelection, fetchJurorStake, fetchStakedVote]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = async (voteForClient: boolean) => {
    if (!publicKey) return;

    setVoting(true);
    setError(null);
    setSuccess(null);

    try {
      await castStakedVote(disputePda, voteForClient);
      setSuccess(
        `Vote cast successfully for ${voteForClient ? 'Client' : 'Freelancer'}!`
      );
      await loadData();
    } catch (err: any) {
      console.error('Error casting vote:', err);
      setError(err.message || 'Failed to cast vote');
    } finally {
      setVoting(false);
    }
  };

  if (!publicKey) {
    return (
      <Card sx={{ border: 1, borderColor: 'divider' }}>
        <CardContent>
          <Alert severity="info">
            Please connect your wallet to participate in voting.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading vote data..."
        logs={[
          { text: 'Fetching dispute state: DISPUTE / MS_DISPUTE', type: 'info' },
          { text: 'getAccountInfo(juror_stake[signer])...', type: 'info' },
          { text: 'Vote window: validating deadline timestamp', type: 'info' },
          { text: 'Ballot ready — vote window open', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  return (
    <Card
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        backgroundImage: 'none',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <HowToVote sx={{ color: primaryMain }} />
          <Typography variant="h6" fontWeight={700}>
            Cast Your Vote
          </Typography>
          {hasVoted && (
            <Chip
              label="Voted"
              color="success"
              size="small"
              icon={<CheckCircle />}
              sx={{ fontWeight: 700 }}
            />
          )}
          {selectionData?.resolved && (
            <Chip
              label="Resolved"
              color="default"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>

        {/* Error / Success */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Not selected warning */}
        {!isSelected && !hasVoted && (
          <Alert severity="warning" sx={{ mb: 2, fontWeight: 500 }}>
            You are not selected as a juror for this dispute.
          </Alert>
        )}

        {/* Deadline passed warning */}
        {deadlinePassed && !selectionData?.resolved && !hasVoted && (
          <Alert severity="error" sx={{ mb: 2, fontWeight: 500 }}>
            The voting deadline has passed. No more votes can be cast.
          </Alert>
        )}

        {/* Already voted - show vote details */}
        {hasVoted && voteRecord && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(0,255,195,0.08)' : 'rgba(5,150,105,0.05)',
              border: 1,
              borderColor: isDark ? 'rgba(0,255,195,0.2)' : 'rgba(5,150,105,0.2)',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckCircle color="success" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={800} color="success.main" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your Vote Recorded
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 1.5, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  VOTED FOR
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                  {voteRecord.voteForClient ? 'Client' : 'Freelancer'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  STAKE LOCKED
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                  {(voteRecord.stakeLocked.toNumber() / 1_000_000_000).toFixed(4)} tokens
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TIMESTAMP
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                  {new Date(voteRecord.votedAt.toNumber() * 1000).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {!selectionData?.resolved && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <HourglassBottom fontSize="small" color="warning" />
                <Typography variant="caption" color="warning.main" fontWeight={700} sx={{ textTransform: 'uppercase' }}>
                  Awaiting final resolution...
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Stake lock info */}
        {isSelected && !hasVoted && stakeData && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(0,255,195,0.05)' : 'rgba(5,150,105,0.03)',
              border: 1,
              borderColor: 'divider',
              mb: 3,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Your stake that will be locked upon voting:
            </Typography>
            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
              {(stakeData.amount.toNumber() / 1_000_000_000).toFixed(4)} tokens
            </Typography>
          </Box>
        )}

        {/* Slashing warning */}
        {isSelected && !hasVoted && !deadlinePassed && (
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{ mb: 3 }}
          >
            <Typography variant="body2" fontWeight={700}>
              Minority Slashing Warning
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.5 }}>
              If you vote with the minority, a percentage of your staked tokens
              will be slashed. Review all evidence carefully.
            </Typography>
          </Alert>
        )}

        {/* Dispute parties info */}
        {!hasVoted && (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              mb: 3,
            }}
          >
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: isDark ? 'rgba(0,255,195,0.05)' : 'rgba(5,150,105,0.05)',
                border: 1,
                borderColor: isDark ? 'rgba(0,255,195,0.15)' : 'rgba(5,150,105,0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Person sx={{ fontSize: 16, color: primaryMain }} />
                <Typography variant="caption" color="primary.main" fontWeight={700}>
                  CLIENT
                </Typography>
              </Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" fontWeight={600}>
                {clientPubkey.toString().slice(0, 4)}...{clientPubkey.toString().slice(-4)}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: isDark ? 'rgba(224,77,1,0.08)' : 'rgba(224,77,1,0.05)',
                border: 1,
                borderColor: isDark ? 'rgba(224,77,1,0.15)' : 'rgba(224,77,1,0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Work sx={{ fontSize: 16, color: warningMain }} />
                <Typography variant="caption" color="warning.main" fontWeight={700}>
                  FREELANCER
                </Typography>
              </Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem" fontWeight={600}>
                {freelancerPubkey.toString().slice(0, 4)}...{freelancerPubkey.toString().slice(-4)}
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Voting Buttons */}
        {!hasVoted && (
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="contained"
              fullWidth
              disabled={!!isDisabled || voting}
              onClick={() => handleVote(true)}
              color="primary"
              sx={{
                py: 1.5,
                fontSize: '0.9rem',
                fontWeight: 800,
                fontFamily: '"Orbitron", sans-serif',
                letterSpacing: 1,
                boxShadow: isDark ? `0 4px 15px ${theme.palette.primary.main}40` : 'none',
              }}
            >
              {voting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <>
                  <Person sx={{ mr: 1, fontSize: 20 }} />
                  VOTE CLIENT
                </>
              )}
            </Button>

            <Button
              variant="contained"
              fullWidth
              disabled={!!isDisabled || voting}
              onClick={() => handleVote(false)}
              color="warning"
              sx={{
                py: 1.5,
                fontSize: '0.9rem',
                fontWeight: 800,
                fontFamily: '"Orbitron", sans-serif',
                letterSpacing: 1,
                boxShadow: isDark ? `0 4px 15px ${theme.palette.warning.main}40` : 'none',
              }}
            >
              {voting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <>
                  <Work sx={{ mr: 1, fontSize: 20 }} />
                  VOTE FREELANCER
                </>
              )}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
