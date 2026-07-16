import { Container, Typography, Box } from '@mui/material';
import { useOptimizedJobsList } from '../../hooks/useOptimizedJobsList';
import JobCard from '../../components/JobCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function BrowseJobs() {
  const { jobs, loading } = useOptimizedJobsList('open');

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
