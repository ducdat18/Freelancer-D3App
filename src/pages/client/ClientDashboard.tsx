import { Container, Typography, Box } from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useClientJobs } from '../../hooks/useJobs';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { useRouter } from 'next/router';

export default function ClientDashboard() {
  const router = useRouter();
  const { connected } = useWallet();
  const { jobs, loading } = useClientJobs();

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

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Client Dashboard
        </Typography>

        {loading ? (
          <LoadingSpinner />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs posted yet"
            description="Start by posting your first job"
            actionLabel="Post a Job"
            onAction={() => router.push('/jobs/create')}
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {jobs.map((job) => (
              <JobCard key={job.publicKey.toString()} job={job} />
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
}
