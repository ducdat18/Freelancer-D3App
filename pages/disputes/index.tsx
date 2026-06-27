import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Alert,
  Button,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import DisputeCard from '../../src/components/common/DisputeCard';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useEscrow } from '../../src/hooks/useEscrow';
import { deriveWorkSubmissionPDA, deriveReputationPDA } from '../../src/utils/pda';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useReputation } from '../../src/hooks/useReputation';
import JurorStakingPanel from '../../src/components/disputes/JurorStakingPanel';

type TabValue = 'all' | 'open' | 'voting' | 'resolved' | 'juror-dashboard';

interface DisputeAccount {
  publicKey: web3.PublicKey;
  account: {
    job: web3.PublicKey;
    escrow: web3.PublicKey;
    client: web3.PublicKey;
    freelancer: web3.PublicKey;
    initiator: web3.PublicKey;
    reason: string;
    status: { 
      open?: {}; 
      resolved?: {}; 
      resolvedClient?: {}; 
      resolvedFreelancer?: {} 
    };
    votesForClient: number;
    votesForFreelancer: number;
    createdAt: { toNumber: () => number };
    resolvedAt: { toNumber: () => number } | null;
    evidenceUris?: string[];
  };
  workSubmission?: {
    deliverableUri: string;
    submittedAt: number;
  };
}

export default function DisputeResolution() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [disputes, setDisputes] = useState<DisputeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { publicKey } = useWallet();
  const { fetchDisputes, getUserVote, hasVoted, voteDispute, resolveDispute } = useEscrow();
  const { program } = useSolanaProgram();
  const { fetchReputation, initializeReputation } = useReputation();
  const [userVotes, setUserVotes] = useState<Record<string, 'client' | 'freelancer'>>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-voted'>('newest');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [votingInProgress, setVotingInProgress] = useState<string | null>(null);
  const [resolvingDispute, setResolvingDispute] = useState<string | null>(null);
  const [initializingReputation, setInitializingReputation] = useState(false);
  const itemsPerPage = 6;

  // Fetch disputes from blockchain
  useEffect(() => {
    const loadDisputes = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedDisputes = await fetchDisputes();

        // Fetch work submissions for each dispute
        const disputesWithWork = await Promise.all(
          (fetchedDisputes as DisputeAccount[]).map(async (dispute) => {
            try {
              if (!program) return dispute;

              const [workSubmissionPda] = deriveWorkSubmissionPDA(dispute.account.job);
              // @ts-ignore
              const workSubmission = await program.account.workSubmission.fetch(workSubmissionPda);

              return {
                ...dispute,
                workSubmission: {
                  deliverableUri: workSubmission.deliverableUri,
                  submittedAt: workSubmission.submittedAt.toNumber(),
                },
              };
            } catch {
              return dispute;
            }
          })
        );

        setDisputes(disputesWithWork as DisputeAccount[]);

        // Fetch user's votes for all disputes
        if (publicKey) {
          const votes: Record<string, 'client' | 'freelancer'> = {};
          await Promise.all(
            disputesWithWork.map(async (dispute) => {
              const userVote = await getUserVote(dispute.publicKey, publicKey);
              if (userVote) {
                votes[dispute.publicKey.toBase58()] = userVote.votedFor;
              }
            })
          );
          setUserVotes(votes);
        }
      } catch (err) {
        setError('Failed to load disputes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDisputes();
  }, [fetchDisputes, program, publicKey, getUserVote]);

  const handleVote = async (disputePda: web3.PublicKey, vote: 'client' | 'freelancer') => {
    if (!publicKey) {
      setError('Please connect your wallet to vote');
      return;
    }

    try {
      setVotingInProgress(disputePda.toBase58());
      setError(null);

      // Find the dispute object to get job, client, freelancer info
      const dispute = disputes.find(d => d.publicKey.toBase58() === disputePda.toBase58());
      if (!dispute) {
        setError('Dispute not found');
        return;
      }

      // Check if user already voted
      const alreadyVoted = await hasVoted(disputePda, publicKey);
      if (alreadyVoted) {
        setError('You have already voted on this dispute');
        return;
      }

      // TESTING: Auto-initialize reputation if not exists (to allow anyone to vote)
      let reputation;
      try {
        reputation = await fetchReputation(publicKey);
      } catch (err: any) {
        // Reputation account doesn't exist yet - auto initialize it
        if (err.message?.includes('does not exist') || err.message?.includes('no data')) {
          try {
            await initializeReputation();
            
            // Wait a bit for transaction to confirm
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Fetch again after initialization
            try {
              reputation = await fetchReputation(publicKey);
            } catch (fetchErr) {
              // Continue anyway - the account exists on chain even if fetch fails
              reputation = { averageRating: 0, totalReviews: 0, completedJobs: 0 };
            }
          } catch (initErr: any) {
            setError('Failed to initialize reputation account. Please try again.');
            return;
          }
        } else {
          throw err;
        }
      }

      // TESTING: Skip reputation value checks (allow any rating/reviews)
      // // Check eligibility (rating >= 4.0, reviews >= 5)
      // if (reputation.averageRating < 4.0) {
      //   setError(`Your average rating is ${reputation.averageRating.toFixed(1)}/5.0. You need at least 4.0 to vote as an arbitrator.`);
      //   return;
      // }

      // if (reputation.totalReviews < 5) {
      //   setError(`You have ${reputation.totalReviews} reviews. You need at least 5 reviews to vote as an arbitrator.`);
      //   return;
      // }

      // Get voter's reputation PDA
      const [voterReputationPda] = deriveReputationPDA(publicKey);

      // Submit vote with all required accounts (will auto-resolve if 2 votes reached)
      const voteForClient = vote === 'client';
      const result = await voteDispute(
        disputePda, 
        voterReputationPda, 
        voteForClient,
        dispute.account.job,
        dispute.account.client,
        dispute.account.freelancer
      );

      // Update user votes state immediately
      setUserVotes(prev => ({
        ...prev,
        [disputePda.toBase58()]: vote
      }));

      // Wait a bit for transaction to confirm and auto-resolve
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh disputes to get updated state (should be auto-resolved if 2 votes)
      const updatedDisputes = await fetchDisputes();
      
      // Fetch work submissions for each dispute
      const disputesWithWork = await Promise.all(
        updatedDisputes.map(async (d: any) => {
          try {
            const [workSubmissionPda] = deriveWorkSubmissionPDA(d.account.job);
            // @ts-ignore
            const workSubmission = await program?.account.workSubmission.fetch(workSubmissionPda);
            return {
              ...d,
              workSubmission: {
                deliverableUri: workSubmission.deliverableUri,
                submittedAt: workSubmission.submittedAt.toNumber(),
              },
            };
          } catch {
            return d;
          }
        })
      );
      setDisputes(disputesWithWork);

      // Check if dispute was auto-resolved
      const currentDispute = disputesWithWork.find(
        (d: any) => d.publicKey.toBase58() === disputePda.toBase58()
      );
      
      if (currentDispute && currentDispute.account.status.resolved) {
        // Dispute was auto-resolved!
        const winner = currentDispute.account.votesForClient > currentDispute.account.votesForFreelancer
          ? 'Client'
          : 'Freelancer';
        
        setSuccessMessage(`🎉 Vote submitted! Dispute auto-resolved with 2 votes. Winner: ${winner}. Funds released.`);
        
        // Auto-switch to resolved tab to see the result
        setActiveTab('resolved');
      } else {
        setSuccessMessage(`✅ Vote submitted successfully! You voted for ${vote === 'client' ? 'Client' : 'Freelancer'}`);
      }
    } catch (err: any) {
      if (err.message?.includes('InsufficientReputation')) {
        setError('Your reputation is not high enough to vote (need rating >= 4.0, reviews >= 5)');
      } else if (err.message?.includes('CannotVoteOwnDispute')) {
        setError('You cannot vote on your own dispute');
      } else if (err.message?.includes('DisputeNotOpen')) {
        setError('This dispute is no longer open for voting');
      } else {
        setError(`Failed to submit vote: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setVotingInProgress(null);
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    const status = dispute.account.status;
    const isResolved = status.resolved || status.resolvedClient || status.resolvedFreelancer;
    
    // "All" tab only shows ACTIVE disputes (open/voting), not resolved
    if (activeTab === 'all') {
      return status.open; // Only show open disputes
    }
    
    if (activeTab === 'open' && status.open && dispute.account.votesForClient === 0 && dispute.account.votesForFreelancer === 0) return true;
    if (activeTab === 'voting' && status.open && (dispute.account.votesForClient > 0 || dispute.account.votesForFreelancer > 0)) return true;
    if (activeTab === 'resolved' && isResolved) return true;

    return false;
  });

  // Sort disputes
  const sortedDisputes = [...filteredDisputes].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.account.createdAt.toNumber() - a.account.createdAt.toNumber();
    } else if (sortBy === 'oldest') {
      return a.account.createdAt.toNumber() - b.account.createdAt.toNumber();
    } else if (sortBy === 'most-voted') {
      const totalA = a.account.votesForClient + a.account.votesForFreelancer;
      const totalB = b.account.votesForClient + b.account.votesForFreelancer;
      return totalB - totalA;
    }
    return 0;
  });

  // Paginate disputes
  const totalPages = Math.ceil(sortedDisputes.length / itemsPerPage);
  const paginatedDisputes = sortedDisputes.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check if user can vote on a dispute
  const canUserVote = (dispute: DisputeAccount) => {
    if (!publicKey) return false;
    // TESTING: Allow client/freelancer to vote on their own dispute
    // // Can't vote on your own dispute
    // if (dispute.account.client.equals(publicKey) || dispute.account.freelancer.equals(publicKey)) {
    //   return false;
    // }
    // Can only vote on open disputes
    return dispute.account.status.open !== undefined;
  };

  // Manual resolve for old disputes (before auto-resolve was enabled)
  const handleManualResolve = async (dispute: DisputeAccount) => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setResolvingDispute(dispute.publicKey.toBase58());
      
      await resolveDispute(
        dispute.publicKey,
        dispute.account.job,
        dispute.account.client,
        dispute.account.freelancer
      );
      
      const winner = dispute.account.votesForClient > dispute.account.votesForFreelancer
        ? 'Client'
        : 'Freelancer';
      
      setSuccessMessage(`🎉 Dispute resolved! Winner: ${winner}. Funds released.`);
      
      // Refresh disputes
      const updatedDisputes = await fetchDisputes();
      const disputesWithWork = await Promise.all(
        updatedDisputes.map(async (d: any) => {
          try {
            const [workSubmissionPda] = deriveWorkSubmissionPDA(d.account.job);
            // @ts-ignore
            const workSubmission = await program?.account.workSubmission.fetch(workSubmissionPda);
            return {
              ...d,
              workSubmission: {
                deliverableUri: workSubmission.deliverableUri,
                submittedAt: workSubmission.submittedAt.toNumber(),
              },
            };
          } catch {
            return d;
          }
        })
      );
      setDisputes(disputesWithWork);
      
      // Auto-switch to resolved tab
      setActiveTab('resolved');
    } catch (err: any) {
      setError(`Failed to resolve dispute: ${err.message || 'Unknown error'}`);
    } finally {
      setResolvingDispute(null);
    }
  };

  // Map dispute status to DisputeCard status
  const getDisputeStatus = (dispute: DisputeAccount): 'open' | 'voting' | 'resolved' => {
    // Check all resolved states
    if (
      dispute.account.status.resolved || 
      (dispute.account.status as any).resolvedClient || 
      (dispute.account.status as any).resolvedFreelancer
    ) {
      return 'resolved';
    }
    if (dispute.account.votesForClient > 0 || dispute.account.votesForFreelancer > 0) return 'voting';
    return 'open';
  };

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  const openCount = disputes.filter(d => d.account.status.open).length;
  const votingCount = disputes.filter(d => d.account.status.open && (d.account.votesForClient > 0 || d.account.votesForFreelancer > 0)).length;
  const resolvedCount = disputes.filter(d => d.account.status.resolved || (d.account.status as any).resolvedClient || (d.account.status as any).resolvedFreelancer).length;

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box
          sx={{
            mb: 4,
            pb: 4,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <GavelIcon sx={{ color: 'primary.main', fontSize: 36 }} />
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
              Dispute Resolution
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, maxWidth: 600, mb: 3 }}>
            Community-driven arbitration — arbitrators review evidence and vote to release escrow to the rightful party.
          </Typography>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[
              { icon: <GavelIcon sx={{ fontSize: 18 }} />, label: 'Open', value: openCount, color: theme.palette.warning.main },
              { icon: <HowToVoteIcon sx={{ fontSize: 18 }} />, label: 'Voting', value: votingCount, color: theme.palette.info.main },
              { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, label: 'Resolved', value: resolvedCount, color: theme.palette.success.main },
            ].map(stat => (
              <Box
                key={stat.label}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 2, py: 1, borderRadius: 2,
                  bgcolor: isDark ? alpha(stat.color, 0.08) : alpha(stat.color, 0.05),
                  border: 1, borderColor: alpha(stat.color, 0.2),
                }}
              >
                <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: stat.color, fontFamily: '"Orbitron", monospace', fontSize: '0.8rem' }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.75rem' }}>
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Paper sx={{ mb: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label={`All Disputes (${disputes.length})`} value="all" />
              <Tab
                label={`Open (${disputes.filter(d => d.account.status.open).length})`}
                value="open"
              />
              <Tab
                label={`Voting (${disputes.filter(d => d.account.status.open && (d.account.votesForClient > 0 || d.account.votesForFreelancer > 0)).length})`}
                value="voting"
              />
              <Tab
                label={`Resolved (${disputes.filter(d => d.account.status.resolved).length})`}
                value="resolved"
              />
              <Tab label="Juror Dashboard" value="juror-dashboard" />
            </Tabs>
          </Box>
          
          {/* Sort & Filter Controls */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {paginatedDisputes.length} of {sortedDisputes.length} disputes
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setPage(1); // Reset to first page
                }}
              >
                <MenuItem value="newest">📅 Newest First</MenuItem>
                <MenuItem value="oldest">📅 Oldest First</MenuItem>
                <MenuItem value="most-voted">🗳️ Most Voted</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && error === 'reputation_not_initialized' ? (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={async () => {
                  setInitializingReputation(true);
                  try {
                    await initializeReputation();
                    setSuccessMessage('✅ Reputation initialized! You can now build your reputation by completing jobs.');
                    setError(null);
                  } catch (err: any) {
                    setError(`Failed to initialize reputation: ${err.message || 'Unknown error'}`);
                  } finally {
                    setInitializingReputation(false);
                  }
                }}
                disabled={initializingReputation}
              >
                {initializingReputation ? 'Initializing...' : 'Initialize Reputation'}
              </Button>
            }
          >
            <strong>Reputation Not Initialized</strong>
            <br />
            You need to initialize your reputation account before you can vote as an arbitrator. Click the button to create your reputation account (requires ~0.001 SOL for account rent).
          </Alert>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {activeTab === 'juror-dashboard' ? (
          <Box sx={{ mt: 3 }}>
            <JurorStakingPanel />
          </Box>
        ) : loading ? (
          <LoadingSpinner message="Loading disputes..." />
        ) : sortedDisputes.length === 0 ? (
          <EmptyState
            title="No disputes found"
            message={
              activeTab === 'all'
                ? 'There are no disputes at the moment.'
                : `There are no ${activeTab} disputes.`
            }
          />
        ) : (
          <>
            <Box 
              sx={{ 
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                  lg: 'repeat(2, 1fr)',
                },
                gap: 3,
                mb: 4,
              }}
            >
              {paginatedDisputes.map((dispute) => {
              const disputeId = dispute.publicKey.toBase58();
              
              return (
                <DisputeCard
                  key={disputeId}
                  disputeId={dispute.publicKey.toBase58().slice(0, 8)}
                  jobId={dispute.account.job.toBase58()}
                  jobTitle={`Disputed Job #${dispute.account.job.toBase58().slice(0, 8)}...`}
                  client={dispute.account.client.toBase58()}
                  freelancer={dispute.account.freelancer.toBase58()}
                  amount={`Escrow Locked`}
                  status={getDisputeStatus(dispute)}
                  openedAt={new Date(dispute.account.createdAt.toNumber() * 1000)}
                  reason={dispute.account.reason}
                  votesFor={dispute.account.votesForClient}
                  votesAgainst={dispute.account.votesForFreelancer}
                  userVote={userVotes[disputeId]}
                  onViewDetails={() => router.push(`/disputes/${disputeId}`)}
                  deliverableUri={dispute.workSubmission?.deliverableUri}
                  workSubmittedAt={
                    dispute.workSubmission
                      ? new Date(dispute.workSubmission.submittedAt * 1000)
                      : undefined
                  }
                  evidenceUris={dispute.account.evidenceUris || []}
                />
              );
              })}
            </Box>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: '1rem',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </>
  );
}
