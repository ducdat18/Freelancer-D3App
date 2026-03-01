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
      <Card>
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
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <HowToVote color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Cast Your Vote
          </Typography>
          {hasVoted && (
            <Chip
              label="Voted"
              color="success"
              size="small"
              icon={<CheckCircle />}
            />
          )}
          {selectionData?.resolved && (
            <Chip
              label="Resolved"
              color="default"
              size="small"
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
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are not selected as a juror for this dispute. Only selected jurors
            can vote.
          </Alert>
        )}

        {/* Deadline passed warning */}
        {deadlinePassed && !selectionData?.resolved && !hasVoted && (
          <Alert severity="error" sx={{ mb: 2 }}>
            The voting deadline has passed. No more votes can be cast.
          </Alert>
        )}

        {/* Already voted - show vote details */}
        {hasVoted && voteRecord && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(0,255,195,0.08)',
              border: '1px solid rgba(0,255,195,0.2)',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CheckCircle color="success" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700} color="success.main">
                Your Vote Has Been Recorded
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Voted For
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {voteRecord.voteForClient ? 'Client' : 'Freelancer'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Stake Locked
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {(voteRecord.stakeLocked.toNumber() / 1_000_000_000).toFixed(4)} tokens
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Voted At
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {new Date(voteRecord.votedAt.toNumber() * 1000).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {!selectionData?.resolved && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <HourglassBottom fontSize="small" color="warning" />
                <Typography variant="body2" color="warning.main" fontWeight={600}>
                  Waiting for resolution...
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
              bgcolor: 'rgba(0,255,195,0.05)',
              border: '1px solid rgba(0,255,195,0.15)',
              mb: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Your stake that will be locked upon voting
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
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
            <Typography variant="body2" fontWeight={600}>
              Minority Slashing Warning
            </Typography>
            <Typography variant="body2">
              If you vote with the minority, a percentage of your staked tokens
              will be slashed. Vote carefully after reviewing all evidence.
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
                bgcolor: 'rgba(0,255,195,0.05)',
                border: '1px solid rgba(0,255,195,0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Person sx={{ fontSize: 16, color: '#00ffc3' }} />
                <Typography variant="caption" color="#00ffc3" fontWeight={600}>
                  Client
                </Typography>
              </Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                {clientPubkey.toString().slice(0, 4)}...{clientPubkey.toString().slice(-4)}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: 'rgba(224,77,1,0.08)',
                border: '1px solid rgba(224,77,1,0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Work sx={{ fontSize: 16, color: '#e04d01' }} />
                <Typography variant="caption" color="#e04d01" fontWeight={600}>
                  Freelancer
                </Typography>
              </Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                {freelancerPubkey.toString().slice(0, 4)}...{freelancerPubkey.toString().slice(-4)}
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        {/* Voting Buttons */}
        {!hasVoted && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              fullWidth
              disabled={!!isDisabled || voting}
              onClick={() => handleVote(true)}
              sx={{
                py: 2,
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #00ffc3 0%, #00d9a6 100%)',
                boxShadow: '0 4px 12px rgba(0,255,195,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00d9a6 0%, #00b388 100%)',
                  boxShadow: '0 6px 16px rgba(0,255,195,0.4)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              {voting ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                <>
                  <Person sx={{ mr: 1 }} />
                  Vote for Client
                </>
              )}
            </Button>

            <Button
              variant="contained"
              fullWidth
              disabled={!!isDisabled || voting}
              onClick={() => handleVote(false)}
              sx={{
                py: 2,
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #e04d01 0%, #ff7033 100%)',
                boxShadow: '0 4px 12px rgba(224,77,1,0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #ff7033 0%, #e04d01 100%)',
                  boxShadow: '0 6px 16px rgba(224,77,1,0.4)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              {voting ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                <>
                  <Work sx={{ mr: 1 }} />
                  Vote for Freelancer
                </>
              )}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
