import { useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { Work, Person } from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/router';
import { useAllJobsQuery } from '../hooks/queries/useJobsQuery';
import { useUserRoleContext } from '../contexts/UserRoleContext';
import StatsHUD from '../components/dashboard/StatsHUD';
import TerminalLog from '../components/dashboard/TerminalLog';
import EscrowShield from '../components/dashboard/EscrowShield';
import DashboardJobTabs from '../components/dashboard/DashboardJobTabs';
import EmptyState from '../components/EmptyState';

interface DashboardProps {
  forceRole?: 'client' | 'freelancer';
}

export default function Dashboard({ forceRole }: DashboardProps) {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { role } = useUserRoleContext();
  const { data: allJobs, isLoading } = useAllJobsQuery();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const activeRole = forceRole || role.primary;

  const { clientJobs, freelancerJobs, openJobs, inProgressJobs, completedJobs } = useMemo(() => {
    if (!publicKey || !allJobs) {
      return { clientJobs: [], freelancerJobs: [], openJobs: [], inProgressJobs: [], completedJobs: [] };
    }

    const pubStr = publicKey.toBase58();
    const NULL_KEY = new PublicKey('11111111111111111111111111111111');

    const client = allJobs.filter((j) => j.account.client.toBase58() === pubStr);
    const freelancer = allJobs.filter((j) =>
      j.account.selectedFreelancer &&
      !j.account.selectedFreelancer.equals(NULL_KEY) &&
      j.account.selectedFreelancer.toBase58() === pubStr
    );

    const myJobs = [...client, ...freelancer];

    const getStatus = (s: any) => (typeof s === 'object' ? Object.keys(s)[0] : s);

    return {
      clientJobs: client,
      freelancerJobs: freelancer,
      openJobs: myJobs.filter((j) => getStatus(j.account.status) === 'open'),
      inProgressJobs: myJobs.filter((j) => getStatus(j.account.status) === 'inProgress'),
      completedJobs: myJobs.filter((j) => getStatus(j.account.status) === 'completed'),
    };
  }, [publicKey, allJobs]);

  if (!connected) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <EmptyState
            title="Connect your wallet"
            description="Please connect your wallet to view your dashboard"
          />
        </Box>
      </Container>
    );
  }

  // New user onboarding
  if (activeRole === 'new' && !isLoading) {
    return (
      <>
        {/* Page Header */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            background: isDark 
              ? 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)'
              : `linear-gradient(180deg, ${primaryMain}08 0%, transparent 100%)`,
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 0.4, mb: 1.5,
                bgcolor: isDark ? 'rgba(0,255,195,0.06)' : `${primaryMain}15`, 
                border: 1, borderColor: isDark ? 'rgba(0,255,195,0.15)' : `${primaryMain}30`,
                borderRadius: 1,
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: primaryMain, boxShadow: isDark ? `0 0 6px ${primaryMain}` : 'none' }} />
              <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: primaryMain }}>
                // GETTING STARTED
              </Typography>
            </Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                fontFamily: '"Orbitron", sans-serif',
                background: isDark 
                  ? `linear-gradient(135deg, #fff 40%, ${primaryMain} 100%)`
                  : `linear-gradient(135deg, ${theme.palette.text.primary} 40%, ${primaryMain} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1.2, mb: 0.5,
              }}
            >
              Welcome to Lancer Lab
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose your path to get started on-chain
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg">
          <Box sx={{ my: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: isDark ? 'rgba(0,255,195,0.3)' : primaryMain,
                      boxShadow: isDark ? '0 0 32px rgba(0,255,195,0.08)' : `0 4px 20px ${primaryMain}20`,
                    },
                  }}
                  onClick={() => router.push('/jobs/create')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <Box
                      sx={{
                        width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDark 
                          ? 'linear-gradient(135deg, rgba(0,255,195,0.15) 0%, rgba(0,255,195,0.05) 100%)'
                          : `linear-gradient(135deg, ${primaryMain}20 0%, ${primaryMain}05 100%)`,
                        border: 1, borderColor: isDark ? 'rgba(0,255,195,0.2)' : `${primaryMain}40`,
                        boxShadow: isDark ? '0 0 24px rgba(0,255,195,0.1)' : `0 4px 15px ${primaryMain}15`,
                      }}
                    >
                      <Work sx={{ fontSize: 36, color: primaryMain }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif', fontSize: '1rem' }}>
                      Post a Job
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                      Hire talented freelancers. Funds held in trustless escrow until work is approved.
                    </Typography>
                    <Button variant="contained" size="small" sx={{ px: 3 }}>
                      Get Started →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: isDark ? 'rgba(153,69,255,0.35)' : secondaryMain,
                      boxShadow: isDark ? '0 0 32px rgba(153,69,255,0.08)' : `0 4px 20px ${secondaryMain}20`,
                    },
                  }}
                  onClick={() => router.push('/jobs')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <Box
                      sx={{
                        width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDark 
                          ? 'linear-gradient(135deg, rgba(153,69,255,0.15) 0%, rgba(153,69,255,0.05) 100%)'
                          : `linear-gradient(135deg, ${secondaryMain}20 0%, ${secondaryMain}05 100%)`,
                        border: 1, borderColor: isDark ? 'rgba(153,69,255,0.2)' : `${secondaryMain}40`,
                        boxShadow: isDark ? '0 0 24px rgba(153,69,255,0.1)' : `0 4px 15px ${secondaryMain}15`,
                      }}
                    >
                      <Person sx={{ fontSize: 36, color: secondaryMain }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif', fontSize: '1rem' }}>
                      Find Work
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                      Browse open jobs, submit bids, and get paid in crypto directly to your wallet.
                    </Typography>
                    <Button variant="outlined" size="small" sx={{ px: 3, borderColor: `${secondaryMain}80`, color: secondaryMain, '&:hover': { borderColor: secondaryMain, bgcolor: `${secondaryMain}15` } }}>
                      Browse Jobs →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </>
    );
  }

  // Build tabs based on role
  const getTabs = () => {
    if (activeRole === 'client') {
      return [
        {
          label: 'My Posted Jobs',
          jobs: clientJobs.filter((j) => {
            const s = typeof j.account.status === 'object' ? Object.keys(j.account.status)[0] : j.account.status;
            return s === 'open';
          }),
          emptyTitle: 'No open jobs',
          emptyDescription: 'Post a job to get started',
          emptyActionLabel: 'Post a Job',
          emptyOnAction: () => router.push('/jobs/create'),
        },
        {
          label: 'Active Projects',
          jobs: clientJobs.filter((j) => {
            const s = typeof j.account.status === 'object' ? Object.keys(j.account.status)[0] : j.account.status;
            return s === 'inProgress';
          }),
          emptyTitle: 'No active projects',
          emptyDescription: 'Accept a bid to start a project',
        },
        {
          label: 'Completed',
          jobs: clientJobs.filter((j) => {
            const s = typeof j.account.status === 'object' ? Object.keys(j.account.status)[0] : j.account.status;
            return s === 'completed';
          }),
          emptyTitle: 'No completed projects yet',
          emptyDescription: 'Complete your first project',
        },
      ];
    }

    if (activeRole === 'freelancer') {
      return [
        {
          label: 'Active Work',
          jobs: freelancerJobs.filter((j) => {
            const s = typeof j.account.status === 'object' ? Object.keys(j.account.status)[0] : j.account.status;
            return s === 'inProgress';
          }),
          emptyTitle: 'No active work',
          emptyDescription: 'Browse and bid on jobs to get started',
          emptyActionLabel: 'Browse Jobs',
          emptyOnAction: () => router.push('/jobs'),
        },
        {
          label: 'Completed',
          jobs: freelancerJobs.filter((j) => {
            const s = typeof j.account.status === 'object' ? Object.keys(j.account.status)[0] : j.account.status;
            return s === 'completed';
          }),
          emptyTitle: 'No completed jobs yet',
          emptyDescription: 'Complete your first job to build reputation',
        },
      ];
    }

    // "both" role - show everything
    return [
      {
        label: 'Open Jobs',
        jobs: openJobs,
        emptyTitle: 'No open jobs',
        emptyDescription: 'Post a job or browse available work',
        emptyActionLabel: 'Browse Jobs',
        emptyOnAction: () => router.push('/jobs'),
      },
      {
        label: 'In Progress',
        jobs: inProgressJobs,
        emptyTitle: 'No jobs in progress',
        emptyDescription: 'Accept a bid or get selected for work',
      },
      {
        label: 'Completed',
        jobs: completedJobs,
        emptyTitle: 'No completed jobs yet',
        emptyDescription: 'Complete your first job',
      },
    ];
  };

  const totalJobs = openJobs.length + inProgressJobs.length + completedJobs.length;

  return (
    <>
      {/* Page Header */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          background: isDark 
            ? 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)'
            : `linear-gradient(180deg, ${primaryMain}08 0%, transparent 100%)`,
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.4, mb: 1.5,
                  bgcolor: isDark ? 'rgba(0,255,195,0.06)' : `${primaryMain}15`, 
                  border: 1, borderColor: isDark ? 'rgba(0,255,195,0.15)' : `${primaryMain}30`,
                  borderRadius: 1,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: primaryMain, boxShadow: isDark ? `0 0 6px ${primaryMain}` : 'none' }} />
                <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: primaryMain }}>
                  // DASHBOARD
                </Typography>
              </Box>
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  fontFamily: '"Orbitron", sans-serif',
                  background: isDark 
                    ? `linear-gradient(135deg, #fff 40%, ${primaryMain} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.text.primary} 40%, ${primaryMain} 100%)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2,
                }}
              >
                My Workspace
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => router.push('/jobs')}
                sx={{ fontSize: '0.78rem', borderColor: isDark ? 'rgba(0,255,195,0.3)' : `${primaryMain}80`, color: primaryMain, '&:hover': { borderColor: primaryMain, bgcolor: isDark ? 'rgba(0,255,195,0.06)' : `${primaryMain}15` } }}
              >
                Browse Jobs
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => router.push('/jobs/create')}
                sx={{ fontSize: '0.78rem' }}
              >
                + Post Job
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          {/* HUD Stats */}
          <Box sx={{ mb: 4 }}>
            <StatsHUD
              stats={[
                { label: 'Open Jobs', value: openJobs.length, color: secondaryMain },
                { label: 'Active Jobs', value: inProgressJobs.length, color: primaryMain },
                { label: 'Completed', value: completedJobs.length, color: theme.palette.success.main, suffix: 'done' },
                { label: 'Total Jobs', value: totalJobs, color: theme.palette.warning.main },
              ]}
            />
          </Box>

          {/* Bento Grid: Terminal + Escrow Shield */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ height: 280 }}>
                <TerminalLog />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ height: 280 }}>
                <EscrowShield
                  totalLocked={0}
                  totalReleased={0}
                  activeEscrows={inProgressJobs.length}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Job Tabs */}
          <DashboardJobTabs tabs={getTabs()} loading={isLoading} />
        </Box>
      </Container>
    </>
  );
}
