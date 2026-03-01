import { useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
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
            borderBottom: '1px solid rgba(0,255,195,0.08)',
            background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)',
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Container maxWidth="lg">
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 0.4, mb: 1.5,
                bgcolor: 'rgba(0,255,195,0.06)', border: '1px solid rgba(0,255,195,0.15)',
                borderRadius: 1,
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00ffc3', boxShadow: '0 0 6px #00ffc3' }} />
              <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: '#00ffc3' }}>
                // GETTING STARTED
              </Typography>
            </Box>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                fontFamily: '"Orbitron", sans-serif',
                background: 'linear-gradient(135deg, #fff 40%, #00ffc3 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1.2, mb: 0.5,
              }}
            >
              Welcome to FreelanceChain
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
                    border: '1px solid rgba(0,255,195,0.1)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'rgba(0,255,195,0.3)',
                      boxShadow: '0 0 32px rgba(0,255,195,0.08)',
                    },
                  }}
                  onClick={() => router.push('/jobs/create')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <Box
                      sx={{
                        width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(0,255,195,0.15) 0%, rgba(0,255,195,0.05) 100%)',
                        border: '1px solid rgba(0,255,195,0.2)',
                        boxShadow: '0 0 24px rgba(0,255,195,0.1)',
                      }}
                    >
                      <Work sx={{ fontSize: 36, color: '#00ffc3' }} />
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
                    border: '1px solid rgba(153,69,255,0.1)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'rgba(153,69,255,0.35)',
                      boxShadow: '0 0 32px rgba(153,69,255,0.08)',
                    },
                  }}
                  onClick={() => router.push('/jobs')}
                >
                  <CardContent sx={{ textAlign: 'center', py: 5 }}>
                    <Box
                      sx={{
                        width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(153,69,255,0.15) 0%, rgba(153,69,255,0.05) 100%)',
                        border: '1px solid rgba(153,69,255,0.2)',
                        boxShadow: '0 0 24px rgba(153,69,255,0.1)',
                      }}
                    >
                      <Person sx={{ fontSize: 36, color: '#9945ff' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif', fontSize: '1rem' }}>
                      Find Work
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
                      Browse open jobs, submit bids, and get paid in crypto directly to your wallet.
                    </Typography>
                    <Button variant="outlined" size="small" sx={{ px: 3, borderColor: 'rgba(153,69,255,0.4)', color: '#9945ff', '&:hover': { borderColor: '#9945ff', bgcolor: 'rgba(153,69,255,0.06)' } }}>
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
          borderBottom: '1px solid rgba(0,255,195,0.08)',
          background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)',
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
                  bgcolor: 'rgba(0,255,195,0.06)', border: '1px solid rgba(0,255,195,0.15)',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00ffc3', boxShadow: '0 0 6px #00ffc3' }} />
                <Typography sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.58rem', letterSpacing: '0.12em', color: '#00ffc3' }}>
                  // DASHBOARD
                </Typography>
              </Box>
              <Typography
                variant="h4"
                fontWeight={800}
                sx={{
                  fontFamily: '"Orbitron", sans-serif',
                  background: 'linear-gradient(135deg, #fff 40%, #00ffc3 100%)',
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
                sx={{ fontSize: '0.78rem', borderColor: 'rgba(0,255,195,0.3)', color: '#00ffc3', '&:hover': { borderColor: '#00ffc3', bgcolor: 'rgba(0,255,195,0.06)' } }}
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
                { label: 'Open Jobs', value: openJobs.length, color: '#8084ee' },
                { label: 'Active Jobs', value: inProgressJobs.length, color: '#00ffc3' },
                { label: 'Completed', value: completedJobs.length, color: '#4caf50', suffix: 'done' },
                { label: 'Total Jobs', value: totalJobs, color: '#e04d01' },
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
