import { Container, Typography, Box } from '@mui/material';
import { useJobs } from '../../hooks/useJobs';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { JOB_STATUS } from '../../config/constants';

export default function BrowseJobs() {
  const { jobs, loading } = useJobs({ status: JOB_STATUS.OPEN });

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Browse Jobs
        </Typography>

        <Typography variant="body1" color="text.secondary" gutterBottom>
          Find and apply to open jobs
        </Typography>

        <Box sx={{ mt: 4 }}>
          {loading ? (
            <LoadingSpinner />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No open jobs available"
              description="Check back later for new opportunities"
            />
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {jobs.map((job) => (
                <JobCard key={job.publicKey.toString()} job={job} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}
