import { Container, Typography, Box, Grid, Card } from '@mui/material';
import { motion } from 'framer-motion';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useJobsQuery } from '../../hooks/queries/useJobsQuery';
import { bnToNumber } from '../../types/solana';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

export default function HomeStats() {
  const { data: jobs } = useJobsQuery();

  const stats = (() => {
    if (!jobs || jobs.length === 0) {
      return [
        { label: 'Total Jobs', value: '0' },
        { label: 'Active Jobs', value: '0' },
        { label: 'Total Value', value: '0 SOL' },
        { label: 'Uptime', value: '100%' },
      ];
    }

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => {
      const status = typeof j.account.status === 'object'
        ? Object.keys(j.account.status)[0]
        : j.account.status;
      return status === 'open';
    }).length;
    const totalValue = jobs.reduce(
      (sum, job) => sum + bnToNumber(job.account.budget) / LAMPORTS_PER_SOL,
      0
    ).toFixed(2);

    return [
      { label: 'Total Jobs', value: totalJobs.toString() },
      { label: 'Active Jobs', value: activeJobs.toString() },
      { label: 'Total Value', value: `${totalValue} SOL` },
      { label: 'Uptime', value: '100%' },
    ];
  })();

  return (
    <MotionBox variants={staggerContainer} initial="initial" animate="animate">
      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 6, md: 3 }} key={index}>
            <MotionCard
              variants={staggerChild}
              sx={{ p: 3, textAlign: 'center' }}
              whileHover={{ scale: 1.03, y: -4 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Typography
                variant="h4"
                gutterBottom
                className="neon-text"
                sx={{ fontFamily: '"Orbitron", sans-serif' }}
              >
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </MotionCard>
          </Grid>
        ))}
      </Grid>
    </MotionBox>
  );
}
