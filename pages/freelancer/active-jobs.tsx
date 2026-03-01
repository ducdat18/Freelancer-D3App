import { Container, Typography, Box } from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useJobs } from '../../src/hooks/useJobs';
import JobCard from '../../src/components/JobCard';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import Layout from '../../src/components/Layout';
import { JOB_STATUS } from '../../src/config/constants';

export default function ActiveJobs() {
  const { publicKey } = useWallet();
  const { jobs, loading } = useJobs({ status: JOB_STATUS.IN_PROGRESS });

  // Filter jobs where current user is the selected freelancer
  const myActiveJobs = jobs.filter(job =>
    publicKey &&
    job.account.selectedFreelancer &&
    job.account.selectedFreelancer.equals(publicKey)
  );

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Active Jobs
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Jobs you're currently working on
        </Typography>

        <Box sx={{ mt: 4 }}>
          {loading ? (
            <LoadingSpinner message="Loading active jobs..." />
          ) : myActiveJobs.length === 0 ? (
            <EmptyState
              title="No active jobs"
              message="You don't have any active jobs yet. Browse jobs and submit bids to get started!"
            />
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {myActiveJobs.map(job => (
                <JobCard key={job.publicKey.toString()} job={job} />
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
}
