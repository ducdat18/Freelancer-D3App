import { Container, Typography, Box, Grid, Card, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useJobsQuery } from '../../hooks/queries/useJobsQuery';
import { bnToNumber } from '../../types/solana';
import { staggerContainer, staggerChild } from '../../utils/animations';
import { DEMO_JOBS } from '../../data/demoJobs';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

export default function HomeStats() {
  const { data: jobs } = useJobsQuery();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  const stats = (() => {
    const demoTotal = DEMO_JOBS.length;
    const demoActiveJobs = DEMO_JOBS.filter(j => 'open' in j.account.status).length;
    const demoValue = DEMO_JOBS.reduce(
      (sum, j) => sum + bnToNumber(j.account.budget) / LAMPORTS_PER_SOL, 0
    );

    const chainJobs = jobs || [];
    const chainKeys = new Set(chainJobs.map(j => j.publicKey.toBase58()));
    const uniqueDemoCount = DEMO_JOBS.filter(d => !chainKeys.has(d.publicKey.toBase58())).length;

    const totalJobs = chainJobs.length + uniqueDemoCount;
    const chainActive = chainJobs.filter((j) => {
      const status = typeof j.account.status === 'object'
        ? Object.keys(j.account.status)[0]
        : j.account.status;
      return status === 'open';
    }).length;
    const activeJobs = chainActive + demoActiveJobs;

    const chainValue = chainJobs.reduce(
      (sum, job) => sum + bnToNumber(job.account.budget) / LAMPORTS_PER_SOL, 0
    );
    const totalValue = (chainValue + demoValue).toFixed(1);

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
              sx={{ 
                p: 3, 
                textAlign: 'center',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  borderColor: primaryMain,
                  boxShadow: isDark ? `0 0 20px ${primaryMain}20` : '0 4px 12px rgba(0,0,0,0.05)',
                }
              }}
              whileHover={{ scale: 1.03, y: -4 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Typography
                variant="h4"
                gutterBottom
                sx={{ 
                  fontFamily: '"Orbitron", sans-serif', 
                  fontWeight: 700, 
                  color: primaryMain,
                  textShadow: isDark ? `0 0 10px ${primaryMain}40` : 'none',
                }}
              >
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                {stat.label}
              </Typography>
            </MotionCard>
          </Grid>
        ))}
      </Grid>
    </MotionBox>
  );
}
