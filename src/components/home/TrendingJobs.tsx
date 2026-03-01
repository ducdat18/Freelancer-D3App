import { Container, Typography, Box, Grid, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useJobsQuery } from '../../hooks/queries/useJobsQuery';
import { bnToNumber } from '../../types/solana';
import JobCard from '../JobCard';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);
const MotionGrid = motion.create(Grid);

export default function TrendingJobs() {
  const { data: jobs, isLoading } = useJobsQuery('open');

  const trendingJobs = (jobs || [])
    .sort((a, b) => bnToNumber(b.account.createdAt) - bnToNumber(a.account.createdAt))
    .slice(0, 6);

  if (isLoading || trendingJobs.length === 0) return null;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" fontWeight={600} gutterBottom>
            Trending Jobs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Latest opportunities on the blockchain
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/jobs"
          endIcon={<ArrowForwardIcon />}
          sx={{ display: { xs: 'none', md: 'flex' } }}
        >
          View All Jobs
        </Button>
      </Box>

      <MotionBox
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
      >
        <Grid container spacing={3}>
          {trendingJobs.map((job) => (
            <MotionGrid size={{ xs: 12, sm: 6, md: 4 }} key={job.publicKey.toString()} variants={staggerChild}>
              <JobCard job={job} />
            </MotionGrid>
          ))}
        </Grid>
      </MotionBox>

      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mt: 3 }}>
        <Button component={Link} href="/jobs" endIcon={<ArrowForwardIcon />}>
          View All Jobs
        </Button>
      </Box>
    </Container>
  );
}
