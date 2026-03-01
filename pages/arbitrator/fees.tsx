import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3, BN } from '@coral-xyz/anchor';
import { AccountBalance, CheckCircle, Pending } from '@mui/icons-material';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useEscrow } from '../../src/hooks/useEscrow';
import { deriveEscrowPDA } from '../../src/utils/pda';
import { formatSol } from '../../src/types/solana';

const { LAMPORTS_PER_SOL } = web3;

// Arbitrator fee percentage (must match smart contract)
const ARBITRATOR_FEE_PERCENTAGE = 2; // 2%

interface VoteRecordData {
  publicKey: web3.PublicKey;
  account: {
    dispute: web3.PublicKey;
    voter: web3.PublicKey;
    voteForClient: boolean;
    votedAt: { toNumber: () => number };
    feeClaimed: boolean;
    bump: number;
  };
}

interface DisputeWithFee {
  dispute: any;
  voteRecord: VoteRecordData;
  escrowAmount: number;
  feeAmount: number;
  totalVotes: number;
}

export default function ArbitratorFees() {
  const { publicKey } = useWallet();
  const { fetchArbitratorVotes, fetchDispute, fetchEscrow, claimArbitratorFee } = useEscrow();

  const [loading, setLoading] = useState(true);
  const [claimingDispute, setClaimingDispute] = useState<string | null>(null);
  const [disputesWithFees, setDisputesWithFees] = useState<DisputeWithFee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calculate arbitrator fee
  const calculateFee = (escrowAmount: number, totalVotes: number): number => {
    const totalFee = (escrowAmount * ARBITRATOR_FEE_PERCENTAGE) / 100;
    return totalVotes > 0 ? totalFee / totalVotes : 0;
  };

  // Load all votes and calculate fees
  useEffect(() => {
    const loadFees = async () => {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch all vote records for this arbitrator
        const votes = await fetchArbitratorVotes(publicKey);

        // Fetch dispute and escrow data for each vote
        const disputesData: DisputeWithFee[] = [];

        for (const vote of votes as VoteRecordData[]) {
          try {
            const dispute = await fetchDispute(vote.account.dispute);
            if (!dispute) continue;

            // Only show resolved disputes
            if (!dispute.status.resolved) continue;

            // Get escrow amount
            const escrow = await fetchEscrow(dispute.job);
            const escrowAmount = escrow
              ? escrow.amount.toNumber() / LAMPORTS_PER_SOL
              : 0;

            const totalVotes = dispute.votesForClient + dispute.votesForFreelancer;
            const feeAmount = calculateFee(escrowAmount, totalVotes);

            disputesData.push({
              dispute,
              voteRecord: vote,
              escrowAmount,
              feeAmount,
              totalVotes,
            });
          } catch (err) {
            console.error('Error loading dispute data:', err);
          }
        }

        // Sort by date (newest first)
        disputesData.sort(
          (a, b) =>
            b.voteRecord.account.votedAt.toNumber() -
            a.voteRecord.account.votedAt.toNumber()
        );

        setDisputesWithFees(disputesData);
      } catch (err: any) {
        console.error('Error loading fees:', err);
        setError('Failed to load arbitrator fees. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadFees();
  }, [publicKey, fetchArbitratorVotes, fetchDispute, fetchEscrow]);

  const handleClaim = async (disputeData: DisputeWithFee) => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setClaimingDispute(disputeData.voteRecord.publicKey.toBase58());
      setError(null);

      // Get escrow PDA for fee vault (use job's escrow)
      const [escrowPda] = deriveEscrowPDA(disputeData.dispute.job);

      // Claim fee
      const result = await claimArbitratorFee(
        disputeData.voteRecord.account.dispute,
        escrowPda
      );

      setSuccessMessage(
        `Fee claimed successfully! ${disputeData.feeAmount.toFixed(4)} SOL. Transaction: ${result.signature.slice(0, 8)}...`
      );

      // Update the UI to show claimed status
      setDisputesWithFees((prev) =>
        prev.map((d) =>
          d.voteRecord.publicKey.equals(disputeData.voteRecord.publicKey)
            ? {
                ...d,
                voteRecord: {
                  ...d.voteRecord,
                  account: { ...d.voteRecord.account, feeClaimed: true },
                },
              }
            : d
        )
      );
    } catch (err: any) {
      console.error('Error claiming fee:', err);
      if (err.message?.includes('FeeAlreadyClaimed')) {
        setError('You have already claimed this fee');
      } else if (err.message?.includes('DisputeNotResolved')) {
        setError('This dispute has not been resolved yet');
      } else {
        setError(`Failed to claim fee: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setClaimingDispute(null);
    }
  };

  // Calculate totals
  const totalClaimable = disputesWithFees
    .filter((d) => !d.voteRecord.account.feeClaimed)
    .reduce((sum, d) => sum + d.feeAmount, 0);

  const totalClaimed = disputesWithFees
    .filter((d) => d.voteRecord.account.feeClaimed)
    .reduce((sum, d) => sum + d.feeAmount, 0);

  const totalEarned = totalClaimable + totalClaimed;

  if (!publicKey) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="info">Please connect your wallet to view arbitrator fees</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Arbitrator Fees
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          View and claim your fees earned from voting on disputes
        </Typography>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, my: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AccountBalance color="primary" />
                <Typography variant="caption" color="text.secondary">
                  Total Earned
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {totalEarned.toFixed(4)} SOL
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {disputesWithFees.length} disputes
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="caption" color="text.secondary">
                  Claimed
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {totalClaimed.toFixed(4)} SOL
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {disputesWithFees.filter((d) => d.voteRecord.account.feeClaimed).length} disputes
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Pending color="warning" />
                <Typography variant="caption" color="text.secondary">
                  Claimable
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={600}>
                {totalClaimable.toFixed(4)} SOL
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {disputesWithFees.filter((d) => !d.voteRecord.account.feeClaimed).length} disputes
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Fee List */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Fee History
          </Typography>

          {loading ? (
            <LoadingSpinner message="Loading fees..." />
          ) : disputesWithFees.length === 0 ? (
            <EmptyState
              title="No fees yet"
              message="You haven't earned any arbitrator fees yet. Vote on disputes to earn fees!"
            />
          ) : (
            <Box>
              {disputesWithFees.map((disputeData) => (
                <Box key={disputeData.voteRecord.publicKey.toBase58()}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={500}>
                        Dispute: {disputeData.voteRecord.account.dispute.toBase58().slice(0, 8)}...
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Voted on{' '}
                        {new Date(disputeData.voteRecord.account.votedAt.toNumber() * 1000).toLocaleDateString()}
                        {' • '}
                        {disputeData.totalVotes} total votes
                        {' • '}
                        Escrow: {formatSol(disputeData.escrowAmount)} SOL
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight={600} color="primary.main">
                          {disputeData.feeAmount.toFixed(4)} SOL
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({ARBITRATOR_FEE_PERCENTAGE}% / {disputeData.totalVotes})
                        </Typography>
                      </Box>

                      {disputeData.voteRecord.account.feeClaimed ? (
                        <Chip
                          label="Claimed"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                        />
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={claimingDispute === disputeData.voteRecord.publicKey.toBase58()}
                          onClick={() => handleClaim(disputeData)}
                          sx={{ minWidth: 100 }}
                        >
                          {claimingDispute === disputeData.voteRecord.publicKey.toBase58() ? (
                            <CircularProgress size={20} />
                          ) : (
                            'Claim'
                          )}
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Divider />
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
}
