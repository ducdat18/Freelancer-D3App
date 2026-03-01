import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Alert,
  Tabs,
  Tab,
  Pagination,
  LinearProgress,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ScienceIcon from '@mui/icons-material/Science';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Layout from '../../src/components/Layout';
import ComingSoonBanner from '../../src/components/ComingSoonBanner';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useDAOGovernance } from '../../src/hooks/useDAOGovernance';
import { GovernanceProposalStatus, GovernanceProposalType } from '../../src/types';
import type { ProposalData } from '../../src/types';

type TabValue = 'all' | 'active' | 'approved' | 'executed';

const statusLabels: Record<number, string> = {
  [GovernanceProposalStatus.Active]: 'Active',
  [GovernanceProposalStatus.Approved]: 'Approved',
  [GovernanceProposalStatus.Rejected]: 'Rejected',
  [GovernanceProposalStatus.Executed]: 'Executed',
  [GovernanceProposalStatus.QuorumNotMet]: 'Quorum Not Met',
  [GovernanceProposalStatus.Cancelled]: 'Cancelled',
};

const statusColors: Record<number, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  [GovernanceProposalStatus.Active]: 'info',
  [GovernanceProposalStatus.Approved]: 'success',
  [GovernanceProposalStatus.Rejected]: 'error',
  [GovernanceProposalStatus.Executed]: 'success',
  [GovernanceProposalStatus.QuorumNotMet]: 'warning',
  [GovernanceProposalStatus.Cancelled]: 'default',
};

const proposalTypeLabels: Record<number, string> = {
  [GovernanceProposalType.ParameterChange]: 'Parameter Change',
  [GovernanceProposalType.TreasurySpend]: 'Treasury Spend',
  [GovernanceProposalType.FeatureToggle]: 'Feature Toggle',
  [GovernanceProposalType.ArbitratorElection]: 'Arbitrator Election',
  [GovernanceProposalType.EmergencyAction]: 'Emergency Action',
};

const ITEMS_PER_PAGE = 6;

export default function GovernancePage() {
  const { program } = useSolanaProgram();
  // @ts-ignore
  const isDeployed = typeof program?.methods?.createProposal === 'function';

  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const {
    daoConfig,
    proposals,
    loading,
    error,
    fetchDAOConfig,
    fetchAllProposals,
  } = useDAOGovernance();

  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDAOConfig();
    fetchAllProposals();
  }, [fetchDAOConfig, fetchAllProposals]);

  const filteredProposals = proposals.filter((proposal) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return proposal.status === GovernanceProposalStatus.Active;
    if (activeTab === 'approved') return proposal.status === GovernanceProposalStatus.Approved;
    if (activeTab === 'executed') return proposal.status === GovernanceProposalStatus.Executed;
    return true;
  });

  const sortedProposals = [...filteredProposals].sort((a, b) => b.createdAt - a.createdAt);

  const totalPages = Math.ceil(sortedProposals.length / ITEMS_PER_PAGE);
  const paginatedProposals = sortedProposals.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTimeRemaining = (votingEndsAt: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = votingEndsAt - now;
    if (remaining <= 0) return 'Voting ended';
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h remaining`;
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m remaining`;
  };

  const activeCount = proposals.filter(p => p.status === GovernanceProposalStatus.Active).length;
  const approvedCount = proposals.filter(p => p.status === GovernanceProposalStatus.Approved).length;
  const executedCount = proposals.filter(p => p.status === GovernanceProposalStatus.Executed).length;

  if (!connected) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your wallet to participate in governance."
            actionLabel="Connect Wallet"
            onAction={() => setVisible(true)}
          />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GavelIcon sx={{ fontSize: 40, color: '#00ffc3' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h4" fontWeight={700}>
                  Governance
                </Typography>
                {!isDeployed && (
                  <Chip
                    icon={<ScienceIcon />}
                    label="DEVNET SIMULATION"
                    size="small"
                    sx={{
                      fontFamily: '"Orbitron", monospace',
                      fontSize: '0.55rem',
                      letterSpacing: '0.08em',
                      bgcolor: 'rgba(224,77,1,0.15)',
                      color: '#e04d01',
                      border: '1px solid rgba(224,77,1,0.3)',
                    }}
                  />
                )}
              </Box>
              <Typography variant="body1" color="text.secondary">
                Shape the future of the platform through decentralized proposals and voting
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/governance/create')}
            sx={{ px: 3, py: 1.2, whiteSpace: 'nowrap' }}
          >
            Create Proposal
          </Button>
        </Box>

        {/* DAO Stats */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <Paper
            sx={{
              p: 2.5,
              textAlign: 'center',
              border: '1px solid rgba(0, 255, 195, 0.15)',
              background: 'linear-gradient(135deg, rgba(0,255,195,0.03) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <HowToVoteIcon sx={{ color: '#00ffc3', fontSize: 28, mb: 0.5 }} />
            <Typography variant="h5" fontWeight={700}>
              {daoConfig?.proposalCount ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Proposals
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 2.5,
              textAlign: 'center',
              border: '1px solid rgba(0, 255, 195, 0.15)',
            }}
          >
            <AccountBalanceIcon sx={{ color: '#00ffc3', fontSize: 28, mb: 0.5 }} />
            <Typography variant="h5" fontWeight={700}>
              {daoConfig?.totalProposalsExecuted ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Executed
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 2.5,
              textAlign: 'center',
              border: '1px solid rgba(0, 255, 195, 0.15)',
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              {daoConfig?.quorumPercentage ?? 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Quorum Required
            </Typography>
          </Paper>
          <Paper
            sx={{
              p: 2.5,
              textAlign: 'center',
              border: '1px solid rgba(0, 255, 195, 0.15)',
            }}
          >
            <Typography variant="h5" fontWeight={700}>
              {daoConfig ? `${daoConfig.votingPeriod / 86400}d` : '--'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Voting Period
            </Typography>
          </Paper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                setPage(1);
              }}
            >
              <Tab label={`All (${proposals.length})`} value="all" />
              <Tab label={`Active (${activeCount})`} value="active" />
              <Tab label={`Approved (${approvedCount})`} value="approved" />
              <Tab label={`Executed (${executedCount})`} value="executed" />
            </Tabs>
          </Box>
        </Paper>

        {/* Proposal List */}
        {loading && proposals.length === 0 ? (
          <LoadingSpinner message="Loading proposals..." />
        ) : sortedProposals.length === 0 ? (
          <EmptyState
            title="No Proposals Found"
            description={
              activeTab === 'all'
                ? 'There are no governance proposals yet. Be the first to create one.'
                : `No ${activeTab} proposals found.`
            }
            actionLabel="Create Proposal"
            onAction={() => router.push('/governance/create')}
          />
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
              {paginatedProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onClick={() => router.push(`/governance/${proposal.id}`)}
                  getTimeRemaining={getTimeRemaining}
                />
              ))}
            </Box>

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
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Layout>
  );
}

// ==================== Proposal Card Component ====================

interface ProposalCardProps {
  proposal: ProposalData;
  onClick: () => void;
  getTimeRemaining: (votingEndsAt: number) => string;
}

function ProposalCard({ proposal, onClick, getTimeRemaining }: ProposalCardProps) {
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const isActive = proposal.status === GovernanceProposalStatus.Active;
  const timeText = getTimeRemaining(proposal.votingEndsAt);

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 3,
        cursor: 'pointer',
        border: '1px solid rgba(0, 255, 195, 0.1)',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: 'rgba(0, 255, 195, 0.3)',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 20px rgba(0, 255, 195, 0.08)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" fontWeight={600} noWrap>
              {proposal.title}
            </Typography>
            <Chip
              label={proposalTypeLabels[proposal.proposalType] || 'Unknown'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500, fontSize: '0.7rem' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Proposed by {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-4)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isActive && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {timeText}
              </Typography>
            </Box>
          )}
          <Chip
            label={statusLabels[proposal.status] || 'Unknown'}
            size="small"
            color={statusColors[proposal.status] || 'default'}
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>

      {/* Vote Progress */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            For: {proposal.votesFor}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {proposal.totalVoters} voter{proposal.totalVoters !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Against: {proposal.votesAgainst}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <Box
            sx={{
              width: totalVotes > 0 ? `${forPercentage}%` : '50%',
              background: 'linear-gradient(90deg, #00ffc3, #00e6b0)',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }}
          />
          <Box
            sx={{
              flex: 1,
              background: totalVotes > 0 ? 'rgba(255, 77, 77, 0.5)' : 'rgba(255,255,255,0.08)',
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
}
