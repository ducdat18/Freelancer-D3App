import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  ImageList,
  ImageListItem,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack,
  Gavel,
  Person,
  AccountBalance,
  Warning,
  CheckCircle,
  HowToVote,
  Image as ImageIcon,
  Visibility,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import Layout from '../../src/components/Layout';
import EvidenceUpload from '../../src/components/disputes/EvidenceUpload';
import { useEscrow } from '../../src/hooks/useEscrow';
import { useReputation } from '../../src/hooks/useReputation';
import { deriveReputationPDA, deriveWorkSubmissionPDA } from '../../src/utils/pda';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { getIPFSUrl } from '../../src/services/ipfs';
import { formatDistanceToNow } from 'date-fns';
import JurorSelectionDisplay from '../../src/components/disputes/JurorSelectionDisplay';
import StakedVotingPanel from '../../src/components/disputes/StakedVotingPanel';
import DisputeRewardsClaim from '../../src/components/disputes/DisputeRewardsClaim';

export default function DisputeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { publicKey } = useWallet();
  const { fetchDispute, voteDispute, hasVoted, getUserVote, addDisputeEvidence, fetchDisputes } = useEscrow();
  const { fetchReputation, initializeReputation } = useReputation();
  const { program } = useSolanaProgram();

  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<'client' | 'freelancer' | null>(null);
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);

  // Load dispute details
  useEffect(() => {
    if (!id || !program) return;

    const loadDispute = async () => {
      setLoading(true);
      setError(null);
      try {
        const disputePda = new web3.PublicKey(id as string);
        const disputeData = await fetchDispute(disputePda);

        if (!disputeData) {
          setError('Dispute not found');
          return;
        }

        // Fetch work submission
        let workSubmission = null;
        try {
          const [workSubmissionPda] = deriveWorkSubmissionPDA(disputeData.job);
          // @ts-ignore - Program account types from IDL
          const workData = await program.account.workSubmission.fetch(workSubmissionPda);
          workSubmission = {
            deliverableUri: workData.deliverableUri,
            submittedAt: workData.submittedAt.toNumber(),
          };
        } catch (err) {
          console.log('No work submission found');
        }

        setDispute({
          publicKey: disputePda,
          account: disputeData,
          workSubmission,
        });

        // Check if current user has voted
        if (publicKey) {
          try {
            const vote = await getUserVote(disputePda, publicKey);
            if (vote) {
              setUserVote(vote.votedFor);
            }
          } catch (err) {
            console.log('User has not voted');
          }
        }
      } catch (err: any) {
        console.error('Error loading dispute:', err);
        setError(err.message || 'Failed to load dispute');
      } finally {
        setLoading(false);
      }
    };

    loadDispute();
  }, [id, program, publicKey, fetchDispute, getUserVote]);

  const handleVote = async (vote: 'client' | 'freelancer') => {
    if (!publicKey || !dispute) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setVoting(true);
      setError(null);

      // Check if user already voted
      const alreadyVoted = await hasVoted(dispute.publicKey, publicKey);
      if (alreadyVoted) {
        setError('You have already voted on this dispute');
        return;
      }

      // Auto-initialize reputation if needed
      let reputation;
      try {
        reputation = await fetchReputation(publicKey);
      } catch (err: any) {
        if (err.message?.includes('does not exist') || err.message?.includes('no data')) {
          try {
            console.log('Auto-initializing reputation for voting...');
            await initializeReputation();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
              reputation = await fetchReputation(publicKey);
            } catch (fetchErr) {
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

      // Get voter's reputation PDA
      const [voterReputationPda] = deriveReputationPDA(publicKey);

      // Submit vote
      const voteForClient = vote === 'client';
      await voteDispute(
        dispute.publicKey,
        voterReputationPda,
        voteForClient,
        dispute.account.job,
        dispute.account.client,
        dispute.account.freelancer
      );

      setUserVote(vote);
      setSuccessMessage(`✅ Vote submitted successfully! You voted for ${vote === 'client' ? 'Client' : 'Freelancer'}`);

      // Wait for transaction to confirm
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Reload dispute
      const disputeData = await fetchDispute(dispute.publicKey);
      if (disputeData) {
        setDispute({
          ...dispute,
          account: disputeData,
        });

        // Check if auto-resolved
        const isResolved = 
          disputeData.status.resolved || 
          disputeData.status.resolvedClient || 
          disputeData.status.resolvedFreelancer;

        if (isResolved) {
          const winner = disputeData.votesForClient > disputeData.votesForFreelancer ? 'Client' : 'Freelancer';
          setSuccessMessage(`🎉 Vote submitted! Dispute auto-resolved with 2 votes. Winner: ${winner}. Funds released.`);
        }
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(`Failed to submit vote: ${err.message || 'Unknown error'}`);
    } finally {
      setVoting(false);
    }
  };

  const getStatusInfo = () => {
    if (!dispute) return { label: 'Loading', color: 'default' as const };

    const status = dispute.account.status;
    const isResolved = status.resolved || status.resolvedClient || status.resolvedFreelancer;

    if (isResolved) {
      return { label: 'Resolved', color: 'success' as const, icon: <CheckCircle /> };
    }

    const totalVotes = dispute.account.votesForClient + dispute.account.votesForFreelancer;
    if (totalVotes > 0) {
      return { label: `Voting (${totalVotes}/2)`, color: 'info' as const, icon: <HowToVote /> };
    }

    return { label: 'Open', color: 'warning' as const, icon: <Warning /> };
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading dispute...
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (error && !dispute) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/disputes')}
          >
            Back to Disputes
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!dispute) return null;

  const statusInfo = getStatusInfo();
  const isResolved = 
    dispute.account.status.resolved || 
    dispute.account.status.resolvedClient || 
    dispute.account.status.resolvedFreelancer;
  const isClient = publicKey && dispute.account.client.toBase58() === publicKey.toBase58();
  const isFreelancer = publicKey && dispute.account.freelancer.toBase58() === publicKey.toBase58();
  const canUploadEvidence = (isClient || isFreelancer) && !isResolved;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/disputes')}
            sx={{ mb: 2 }}
          >
            Back to Disputes
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Dispute Resolution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dispute ID: #{dispute.publicKey.toBase58().slice(0, 8)}...
              </Typography>
            </Box>
            <Chip
              label={statusInfo.label}
              color={statusInfo.color}
              icon={statusInfo.icon}
              size="medium"
              sx={{ fontSize: '1rem', py: 3 }}
            />
          </Box>
        </Box>

        {/* Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Dispute Info */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Dispute Reason */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                📋 Dispute Reason
              </Typography>
              <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                {dispute.account.reason || 'No reason provided'}
              </Typography>
            </Paper>

            {/* Submitted Work */}
            {dispute.workSubmission && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  📦 Submitted Work
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Submitted: {new Date(dispute.workSubmission.submittedAt * 1000).toLocaleString()}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Visibility />}
                  onClick={() => window.open(getIPFSUrl(dispute.workSubmission.deliverableUri), '_blank')}
                  sx={{ mt: 2 }}
                >
                  View Deliverable
                </Button>
              </Paper>
            )}

            {/* Evidence Gallery */}
            {dispute.account.evidenceUris && dispute.account.evidenceUris.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ImageIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    📎 Evidence ({dispute.account.evidenceUris.length})
                  </Typography>
                </Box>
                <ImageList cols={3} gap={8}>
                  {dispute.account.evidenceUris.map((uri: string, index: number) => (
                    <ImageListItem
                      key={index}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        overflow: 'hidden',
                        '&:hover': { opacity: 0.8 },
                      }}
                      onClick={() => window.open(getIPFSUrl(uri), '_blank')}
                    >
                      <img
                        src={getIPFSUrl(uri)}
                        alt={`Evidence ${index + 1}`}
                        loading="lazy"
                        style={{ height: 150, objectFit: 'cover' }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Paper>
            )}

            {/* Evidence Upload */}
            {canUploadEvidence && (
              <Box sx={{ mb: 3 }}>
                <EvidenceUpload
                  uploaderRole={isClient ? 'client' : 'freelancer'}
                  onUploadComplete={async (ipfsUri: string) => {
                    try {
                      await addDisputeEvidence(dispute.publicKey, ipfsUri);
                      setSuccessMessage('✅ Evidence added successfully!');
                      
                      // Reload dispute
                      const disputeData = await fetchDispute(dispute.publicKey);
                      if (disputeData) {
                        setDispute({
                          ...dispute,
                          account: disputeData,
                        });
                      }
                    } catch (err: any) {
                      setError(err.message || 'Failed to add evidence');
                      throw err;
                    }
                  }}
                  disabled={!publicKey}
                />
              </Box>
            )}
          </Grid>

          {/* Right Column - Voting & Info */}
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Parties */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                👥 Parties
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {dispute.account.client.toBase58().slice(0, 8)}...
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Freelancer
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {dispute.account.freelancer.toBase58().slice(0, 8)}...
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Escrow Amount
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  Locked
                </Typography>
              </Box>
            </Paper>

            {/* Voting Section */}
            {!isResolved && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  🗳️ Cast Your Vote
                </Typography>

                {userVote ? (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    ✅ You voted for: <strong>{userVote === 'client' ? 'Client' : 'Freelancer'}</strong>
                  </Alert>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Review the evidence and cast your vote:
                    </Typography>

                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      disabled={voting || !publicKey}
                      onClick={() => handleVote('client')}
                      sx={{ mb: 1 }}
                    >
                      {voting ? <CircularProgress size={20} /> : 'Vote for Client'}
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      disabled={voting || !publicKey}
                      onClick={() => handleVote('freelancer')}
                    >
                      {voting ? <CircularProgress size={20} /> : 'Vote for Freelancer'}
                    </Button>

                    {!publicKey && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                        Connect wallet to vote
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Vote Count */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Current Votes: {dispute.account.votesForClient + dispute.account.votesForFreelancer} / 2
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="primary">
                      Client: {dispute.account.votesForClient}
                    </Typography>
                    <Typography variant="body2" color="secondary">
                      Freelancer: {dispute.account.votesForFreelancer}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* Resolution Result */}
            {isResolved && (
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.light' }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  ✅ Dispute Resolved
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Winner:</strong>{' '}
                  {dispute.account.votesForClient > dispute.account.votesForFreelancer
                    ? 'Client'
                    : 'Freelancer'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Final Votes: {dispute.account.votesForClient} - {dispute.account.votesForFreelancer}
                </Typography>
                {dispute.account.resolvedAt && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Resolved {formatDistanceToNow(new Date(dispute.account.resolvedAt.toNumber() * 1000), { addSuffix: true })}
                  </Typography>
                )}
              </Paper>
            )}

            {/* Timeline */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                📅 Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Opened {formatDistanceToNow(new Date(dispute.account.createdAt.toNumber() * 1000), { addSuffix: true })}
              </Typography>
            </Paper>

            {/* Staking-Based Juror Selection */}
            <Box sx={{ mb: 3 }}>
              <JurorSelectionDisplay disputePda={dispute.publicKey} />
            </Box>

            {/* Staked Voting Panel */}
            {!isResolved && (
              <Box sx={{ mb: 3 }}>
                <StakedVotingPanel
                  disputePda={dispute.publicKey}
                  clientPubkey={dispute.account.client}
                  freelancerPubkey={dispute.account.freelancer}
                />
              </Box>
            )}

            {/* Dispute Rewards Claim (after resolution) */}
            {isResolved && publicKey && (
              <Box sx={{ mb: 3 }}>
                <DisputeRewardsClaim
                  disputePda={dispute.publicKey}
                  jurorTokenAccount={publicKey}
                  juryVault={publicKey}
                />
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}

