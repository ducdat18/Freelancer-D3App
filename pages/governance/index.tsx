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
  useTheme,
  alpha,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  
  const router = useRouter();
  const { publicKey, connected } = useWallet();
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

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GavelIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
                  Governance
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Shape the future of the platform through decentralized proposals and voting
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => connected ? router.push('/governance/create') : undefined}
            disabled={!connected}
            title={!connected ? 'Connect wallet to create a proposal' : ''}
            sx={{ px: 3, py: 1.2, whiteSpace: 'nowrap', fontWeight: 700 }}
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
          {[
            { label: 'Total Proposals', value: daoConfig?.proposalCount ?? 0, icon: HowToVoteIcon },
            { label: 'Executed', value: daoConfig?.totalProposalsExecuted ?? 0, icon: AccountBalanceIcon },
            { label: 'Quorum Required', value: `${daoConfig?.quorumPercentage ?? 0}%`, icon: GavelIcon },
            { label: 'Voting Period', value: daoConfig ? `${daoConfig.votingPeriod / 86400}d` : '--', icon: AccessTimeIcon },
          ].map((stat, i) => (
            <Paper
              key={i}
              sx={{
                p: 2.5,
                textAlign: 'center',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                backgroundImage: i === 0 ? (isDark ? `linear-gradient(135deg, ${alpha(primaryMain, 0.08)} 0%, transparent 100%)` : `linear-gradient(135deg, ${alpha(primaryMain, 0.04)} 0%, transparent 100%)`) : 'none',
                transition: 'all 0.2s',
                '&:hover': { borderColor: primaryMain, transform: 'translateY(-2px)' }
              }}
            >
              <stat.icon sx={{ color: 'primary.main', fontSize: 28, mb: 0.5, opacity: 0.8 }} />
              <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {stat.label}
              </Typography>
            </Paper>
          ))}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => {
                setActiveTab(v);
                setPage(1);
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`All (${proposals.length})`} value="all" sx={{ fontWeight: 600 }} />
              <Tab label={`Active (${activeCount})`} value="active" sx={{ fontWeight: 600 }} />
              <Tab label={`Approved (${approvedCount})`} value="approved" sx={{ fontWeight: 600 }} />
              <Tab label={`Executed (${executedCount})`} value="executed" sx={{ fontWeight: 600 }} />
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  
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
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        backgroundImage: 'none',
        transition: 'all 0.25s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-3px)',
          boxShadow: isDark ? `0 4px 20px ${alpha(primaryMain, 0.12)}` : '0 4px 20px rgba(0,0,0,0.05)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {proposal.title}
            </Typography>
            <Chip
              label={proposalTypeLabels[proposal.proposalType] || 'Unknown'}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, borderColor: 'divider' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            PROPOSED BY: {proposal.proposer.slice(0, 8)}...{proposal.proposer.slice(-4)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {isActive && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {timeText}
              </Typography>
            </Box>
          )}
          <Chip
            label={statusLabels[proposal.status].toUpperCase() || 'UNKNOWN'}
            size="small"
            color={statusColors[proposal.status] || 'default'}
            sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: 0.5 }}
          />
        </Box>
      </Box>

      {/* Vote Progress */}
      <Box sx={{ mt: 3, p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50', borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="success.main" fontWeight={800}>
              FOR: {proposal.votesFor}
            </Typography>
            <Typography variant="caption" color="text.disabled">|</Typography>
            <Typography variant="caption" color="error.main" fontWeight={800}>
              AGAINST: {proposal.votesAgainst}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {proposal.totalVoters} VOTER{proposal.totalVoters !== 1 ? 'S' : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <Box
            sx={{
              width: totalVotes > 0 ? `${forPercentage}%` : '0%',
              background: `linear-gradient(90deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
              borderRadius: 4,
              transition: 'width 0.5s ease',
            }}
          />
          {totalVotes > 0 && (
            <Box
              sx={{
                flex: 1,
                background: `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                borderRadius: 4,
                transition: 'width 0.5s ease',
                opacity: 0.6
              }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
