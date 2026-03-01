import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Divider,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  EmojiEvents,
  CheckCircle,
  Warning,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import type { PublicKey } from '../../types/solana';
import {
  useStakingDispute,
  type JurorSelectionData,
  type StakedVoteRecordData,
  type DisputeConfigData,
} from '../../hooks/useStakingDispute';

interface DisputeRewardsClaimProps {
  disputePda: PublicKey;
  jurorTokenAccount: PublicKey;
  juryVault: PublicKey;
}

export default function DisputeRewardsClaim({
  disputePda,
  jurorTokenAccount,
  juryVault,
}: DisputeRewardsClaimProps) {
  const { publicKey } = useWallet();
  const {
    claimStakingReward,
    fetchJurorSelection,
    fetchStakedVote,
    fetchDisputeConfig,
  } = useStakingDispute();

  const [selectionData, setSelectionData] = useState<JurorSelectionData | null>(null);
  const [voteRecord, setVoteRecord] = useState<StakedVoteRecordData | null>(null);
  const [configData, setConfigData] = useState<DisputeConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [selection, vote, config] = await Promise.all([
        fetchJurorSelection(disputePda),
        fetchStakedVote(disputePda, publicKey),
        fetchDisputeConfig(),
      ]);
      setSelectionData(selection);
      setVoteRecord(vote);
      setConfigData(config);
    } catch (err: any) {
      console.error('Error loading reward data:', err);
      setError('Failed to load reward data');
    } finally {
      setLoading(false);
    }
  }, [publicKey, disputePda, fetchJurorSelection, fetchStakedVote, fetchDisputeConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async () => {
    if (!publicKey) return;

    setClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      await claimStakingReward(disputePda, jurorTokenAccount, juryVault);
      setSuccess('Reward claimed successfully!');
      await loadData();
    } catch (err: any) {
      console.error('Error claiming reward:', err);
      setError(err.message || 'Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  // Determine majority/minority outcome
  const isResolved = selectionData?.resolved ?? false;
  const hasVoted = voteRecord !== null;
  const alreadyClaimed = voteRecord?.rewardClaimed ?? false;
  const wasSlashed = voteRecord?.slashed ?? false;

  // Calculate reward or slash amount
  const stakeLocked = voteRecord
    ? voteRecord.stakeLocked.toNumber() / 1_000_000_000
    : 0;

  const rewardPercentage = configData?.rewardPercentage ?? 0;
  const slashPercentage = configData?.slashPercentage ?? 0;

  const rewardAmount = stakeLocked * (rewardPercentage / 100);
  const slashAmount = stakeLocked * (slashPercentage / 100);

  // Determine if user voted with majority
  const votedWithMajority = !wasSlashed && hasVoted && isResolved;
  const votedWithMinority = wasSlashed && hasVoted && isResolved;

  const canClaim = isResolved && hasVoted && votedWithMajority && !alreadyClaimed;

  if (!publicKey) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            Please connect your wallet to view dispute rewards.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading dispute rewards..."
        logs={[
          { text: 'PDA: DISPUTE seed=[dispute, job_pda]', type: 'info' },
          { text: 'getAccountInfo(juror_stake[signer])...', type: 'info' },
          { text: 'Computing share: signer_stake / total_pool', type: 'info' },
          { text: 'Claim eligibility resolved', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  // Not participated in this dispute
  if (!hasVoted) {
    return (
      <Card
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Alert severity="info">
            You did not vote in this dispute. No rewards or penalties apply.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Dispute not yet resolved
  if (!isResolved) {
    return (
      <Card
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <EmojiEvents color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Dispute Rewards
            </Typography>
          </Box>
          <Alert severity="warning">
            This dispute has not been resolved yet. Rewards will be available
            after resolution.
          </Alert>
        </CardContent>
      </Card>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <EmojiEvents
            sx={{
              color: votedWithMajority ? 'success.main' : 'error.main',
            }}
          />
          <Typography variant="h6" fontWeight={700}>
            Dispute Rewards
          </Typography>
        </Box>

        {/* Error / Success Messages */}
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

        {/* Majority Voter - Reward */}
        {votedWithMajority && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(0,255,195,0.08)',
              border: '1px solid rgba(0,255,195,0.25)',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <CheckCircle color="success" />
              <Typography variant="subtitle1" fontWeight={700} color="success.main">
                You voted with the majority!
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your vote was on the winning side. You are eligible to claim your
              staking reward.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 3,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Stake Locked
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {stakeLocked.toFixed(4)} tokens
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Reward ({rewardPercentage}%)
                </Typography>
                <Typography variant="body1" fontWeight={700} color="success.main">
                  +{rewardAmount.toFixed(4)} tokens
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Return
                </Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">
                  {(stakeLocked + rewardAmount).toFixed(4)} tokens
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Minority Voter - Slashed */}
        {votedWithMinority && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'rgba(255,0,255,0.08)',
              border: '1px solid rgba(255,0,255,0.25)',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Warning color="error" />
              <Typography variant="subtitle1" fontWeight={700} color="error.main">
                You voted with the minority
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Your vote was on the losing side. A portion of your stake has been
              slashed as a penalty.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 3,
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Stake Locked
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {stakeLocked.toFixed(4)} tokens
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Slashed ({slashPercentage}%)
                </Typography>
                <Typography variant="body1" fontWeight={700} color="error.main">
                  -{slashAmount.toFixed(4)} tokens
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Returned
                </Typography>
                <Typography variant="body1" fontWeight={700} color="warning.main">
                  {(stakeLocked - slashAmount).toFixed(4)} tokens
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Vote Details */}
        {voteRecord && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid',
              borderColor: 'divider',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Your Vote
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {voteRecord.voteForClient ? 'Client' : 'Freelancer'}
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
          </Box>
        )}

        {/* Claim Button */}
        {canClaim && (
          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={handleClaim}
            disabled={claiming}
            startIcon={
              claiming ? (
                <CircularProgress size={20} sx={{ color: 'white' }} />
              ) : (
                <AccountBalanceWallet />
              )
            }
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 700,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #00ffc3 0%, #00d9a6 100%)',
              boxShadow: '0 4px 12px rgba(0,255,195,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00d9a6 0%, #00b388 100%)',
                boxShadow: '0 6px 16px rgba(0,255,195,0.4)',
              },
            }}
          >
            {claiming ? 'Claiming...' : 'Claim Reward'}
          </Button>
        )}

        {/* Already claimed */}
        {alreadyClaimed && (
          <Alert
            severity="success"
            icon={<CheckCircle />}
          >
            You have already claimed your reward for this dispute.
          </Alert>
        )}

        {/* Slashed - no claim available */}
        {votedWithMinority && !alreadyClaimed && (
          <Alert severity="info">
            Your remaining stake (minus the slashed amount) has been returned to
            your staking account automatically.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
