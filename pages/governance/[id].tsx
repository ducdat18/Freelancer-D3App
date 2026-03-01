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
  Grid,
  TextField,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  HowToVote,
  ThumbUp,
  ThumbDown,
  CheckCircle,
  Cancel,
  PlayArrow,
  Gavel,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDAOGovernance } from '../../src/hooks/useDAOGovernance';
import { GovernanceProposalStatus, GovernanceProposalType } from '../../src/types';
import type { ProposalData } from '../../src/types';
import { getSimDescription, hasVoted } from '../../src/utils/governanceSimulator';
import { formatSol } from '../../src/types/solana';

const proposalTypeLabels: Record<number, string> = {
  [GovernanceProposalType.ParameterChange]: 'Parameter Change',
  [GovernanceProposalType.TreasurySpend]: 'Treasury Spend',
  [GovernanceProposalType.FeatureToggle]: 'Feature Toggle',
  [GovernanceProposalType.ArbitratorElection]: 'Arbitrator Election',
  [GovernanceProposalType.EmergencyAction]: 'Emergency Action',
};

const proposalStatusLabels: Record<number, { label: string; color: 'warning' | 'success' | 'error' | 'info' | 'default' }> = {
  [GovernanceProposalStatus.Active]: { label: 'Active', color: 'warning' },
  [GovernanceProposalStatus.Approved]: { label: 'Approved', color: 'success' },
  [GovernanceProposalStatus.Rejected]: { label: 'Rejected', color: 'error' },
  [GovernanceProposalStatus.Executed]: { label: 'Executed', color: 'info' },
  [GovernanceProposalStatus.QuorumNotMet]: { label: 'Quorum Not Met', color: 'default' },
  [GovernanceProposalStatus.Cancelled]: { label: 'Cancelled', color: 'default' },
};

export default function ProposalDetail() {
  const { program } = useSolanaProgram();
  // @ts-ignore
  const isDeployed = typeof program?.methods?.createProposal === 'function';

  const router = useRouter();
  const { id } = router.query;
  const { publicKey } = useWallet();
  const {
    currentProposal,
    loading,
    error,
    fetchProposal,
    castDAOVote,
    finalizeProposal,
    executeProposal,
  } = useDAOGovernance();

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [description, setDescription] = useState<string>('');
  const [voteWeight, setVoteWeight] = useState<string>('1');
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const proposalId = id ? parseInt(id as string, 10) : null;

  // Fetch proposal data
  useEffect(() => {
    if (proposalId === null || isNaN(proposalId)) return;

    const loadProposal = async () => {
      const data = await fetchProposal(proposalId);
      if (data) {
        setProposal(data);

        // Load description
        if (data.descriptionUri?.startsWith('sim://')) {
          // Simulation: description stored in localStorage
          const simId = parseInt(data.descriptionUri.replace('sim://', ''), 10);
          setDescription(getSimDescription(simId));
        } else if (data.descriptionUri) {
          // Real IPFS fetch
          try {
            const ipfsUrl = data.descriptionUri.startsWith('ipfs://')
              ? `https://gateway.pinata.cloud/ipfs/${data.descriptionUri.replace('ipfs://', '')}`
              : data.descriptionUri;
            const res = await fetch(ipfsUrl);
            setDescription(res.ok ? await res.text() : 'Unable to load description from IPFS.');
          } catch {
            setDescription('Unable to load description from IPFS.');
          }
        }
      }
    };

    loadProposal();
  }, [proposalId, fetchProposal]);

  // Check if current wallet already voted (simulation)
  useEffect(() => {
    if (proposalId !== null && publicKey && !isDeployed) {
      setAlreadyVoted(hasVoted(proposalId, publicKey.toBase58()));
    }
  }, [proposalId, publicKey, isDeployed]);

  const handleVote = async (voteFor: boolean) => {
    if (!publicKey || proposalId === null) {
      setLocalError('Please connect your wallet to vote.');
      return;
    }

    const weight = parseInt(voteWeight, 10);
    if (isNaN(weight) || weight <= 0) {
      setLocalError('Please enter a valid vote weight.');
      return;
    }

    try {
      setVoting(true);
      setLocalError(null);
      await castDAOVote(proposalId, voteFor, weight, 0);
      setSuccessMessage(`Vote cast successfully! You voted ${voteFor ? 'For' : 'Against'} with weight ${weight}.`);
      setAlreadyVoted(true);
      // Reload proposal
      const updated = await fetchProposal(proposalId);
      if (updated) setProposal(updated);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to cast vote.');
    } finally {
      setVoting(false);
    }
  };

  const handleFinalize = async () => {
    if (proposalId === null) return;
    try {
      setFinalizing(true);
      setLocalError(null);
      await finalizeProposal(proposalId);
      setSuccessMessage('Proposal finalized successfully.');
      const updated = await fetchProposal(proposalId);
      if (updated) setProposal(updated);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to finalize proposal.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleExecute = async () => {
    if (proposalId === null) return;
    try {
      setExecuting(true);
      setLocalError(null);
      await executeProposal(proposalId);
      setSuccessMessage('Proposal executed successfully.');
      const updated = await fetchProposal(proposalId);
      if (updated) setProposal(updated);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to execute proposal.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading && !proposal) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <LoadingSpinner message="Loading proposal..." />
        </Container>
      </Layout>
    );
  }

  if ((error || localError) && !proposal) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || localError}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={() => router.push('/governance')}
          >
            Back to Governance
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!proposal) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <EmptyState
            title="Proposal Not Found"
            description="The proposal you are looking for does not exist."
            actionLabel="Back to Governance"
            onAction={() => router.push('/governance')}
          />
        </Container>
      </Layout>
    );
  }

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votesAgainst / totalVotes) * 100 : 0;
  const statusInfo = proposalStatusLabels[proposal.status] || { label: 'Unknown', color: 'default' as const };
  const isActive = proposal.status === GovernanceProposalStatus.Active;
  const isApproved = proposal.status === GovernanceProposalStatus.Approved;
  const votingEnded = Date.now() / 1000 > proposal.votingEndsAt;

  const timelineSteps = [
    {
      label: 'Created',
      description: new Date(proposal.createdAt * 1000).toLocaleString(),
      completed: true,
    },
    {
      label: 'Voting Ends',
      description: new Date(proposal.votingEndsAt * 1000).toLocaleString(),
      completed: votingEnded,
    },
    {
      label: 'Executed',
      description: proposal.executed
        ? 'Proposal executed'
        : isApproved
          ? 'Ready to execute'
          : 'Pending',
      completed: proposal.executed,
    },
  ];

  const activeStep = proposal.executed ? 3 : votingEnded ? 2 : 1;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/governance')}
            sx={{ mb: 2 }}
          >
            Back to Governance
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {proposal.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                <Chip label={proposalTypeLabels[proposal.proposalType] || 'Unknown Type'} variant="outlined" size="small" />
                <Chip label={`Proposal #${proposal.id}`} variant="outlined" size="small" />
                {!isDeployed && (
                  <Chip
                    icon={<ScienceIcon style={{ fontSize: 12 }} />}
                    label="SIMULATION"
                    size="small"
                    sx={{
                      fontFamily: '"Orbitron", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.06em',
                      bgcolor: 'rgba(224,77,1,0.12)',
                      color: '#e04d01',
                      border: '1px solid rgba(224,77,1,0.25)',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Messages */}
        {localError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setLocalError(null)}>
            {localError}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Proposal Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* Description */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Description
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {description || 'Loading description...'}
              </Typography>
            </Paper>

            {/* Proposer Info */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Proposer
              </Typography>
              <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                {proposal.proposer}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Voters: {proposal.totalVoters}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stake: {formatSol(proposal.stakeAmount / 1e9)} SOL
                </Typography>
              </Box>
            </Paper>

            {/* Vote Results */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Vote Results
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    For: {proposal.votesFor} ({forPercentage.toFixed(1)}%)
                  </Typography>
                  <Typography variant="body2" color="error.main" fontWeight={600}>
                    Against: {proposal.votesAgainst} ({againstPercentage.toFixed(1)}%)
                  </Typography>
                </Box>
                <Box sx={{ position: 'relative', height: 24, borderRadius: 2, overflow: 'hidden', bgcolor: 'error.dark' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${forPercentage}%`,
                      bgcolor: 'success.main',
                      transition: 'width 0.5s ease',
                      borderRadius: forPercentage === 100 ? 2 : '8px 0 0 8px',
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Total votes cast: {totalVotes}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column - Voting & Actions */}
          <Grid size={{ xs: 12, md: 4 }}>
            {/* Voting Section */}
            {isActive && !votingEnded && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HowToVote color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Cast Your Vote
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {alreadyVoted ? (
                  <Alert severity="info" icon={<CheckCircle />}>
                    You have already voted on this proposal.
                  </Alert>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      label="Vote Weight (token amount)"
                      type="number"
                      value={voteWeight}
                      onChange={(e) => setVoteWeight(e.target.value)}
                      inputProps={{ min: 1 }}
                      sx={{ mb: 2 }}
                      size="small"
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={voting ? <CircularProgress size={18} /> : <ThumbUp />}
                      disabled={voting || !publicKey}
                      onClick={() => handleVote(true)}
                      sx={{ mb: 1 }}
                    >
                      Vote For
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      startIcon={voting ? <CircularProgress size={18} /> : <ThumbDown />}
                      disabled={voting || !publicKey}
                      onClick={() => handleVote(false)}
                    >
                      Vote Against
                    </Button>

                    {!publicKey && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                        Connect wallet to vote
                      </Typography>
                    )}
                  </>
                )}
              </Paper>
            )}

            {/* Finalize Button */}
            {isActive && votingEnded && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Voting Period Ended
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The voting period has ended. Finalize the proposal to tally votes and determine the outcome.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  startIcon={finalizing ? <CircularProgress size={18} /> : <Gavel />}
                  disabled={finalizing || !publicKey}
                  onClick={handleFinalize}
                >
                  {finalizing ? 'Finalizing...' : 'Finalize Proposal'}
                </Button>
              </Paper>
            )}

            {/* Execute Button */}
            {isApproved && !proposal.executed && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Proposal Approved
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This proposal has been approved and is ready for execution.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={executing ? <CircularProgress size={18} /> : <PlayArrow />}
                  disabled={executing || !publicKey}
                  onClick={handleExecute}
                >
                  {executing ? 'Executing...' : 'Execute Proposal'}
                </Button>
              </Paper>
            )}

            {/* Status Card for resolved proposals */}
            {(proposal.status === GovernanceProposalStatus.Rejected ||
              proposal.status === GovernanceProposalStatus.Executed ||
              proposal.status === GovernanceProposalStatus.QuorumNotMet ||
              proposal.status === GovernanceProposalStatus.Cancelled) && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {proposal.status === GovernanceProposalStatus.Executed ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Cancel color="error" />
                  )}
                  <Typography variant="h6" fontWeight={700}>
                    {statusInfo.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {proposal.status === GovernanceProposalStatus.Executed
                    ? 'This proposal has been executed on-chain.'
                    : proposal.status === GovernanceProposalStatus.Rejected
                      ? 'This proposal was rejected by voters.'
                      : proposal.status === GovernanceProposalStatus.QuorumNotMet
                        ? 'This proposal did not meet the required quorum.'
                        : 'This proposal has been cancelled.'}
                </Typography>
              </Paper>
            )}

            {/* Timeline */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Timeline
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stepper activeStep={activeStep} orientation="vertical">
                {timelineSteps.map((step) => (
                  <Step key={step.label} completed={step.completed}>
                    <StepLabel>
                      <Typography variant="body2" fontWeight={600}>
                        {step.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
}
