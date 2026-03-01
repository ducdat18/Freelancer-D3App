import { Container, Typography, Box, Button, Chip, Grid } from '@mui/material';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ArrowForward, Lock, Speed, PublicOutlined } from '@mui/icons-material';
import Logo from '../src/components/Logo';
import Layout from '../src/components/Layout';
import HomeStats from '../src/components/home/HomeStats';
import TrendingJobs from '../src/components/home/TrendingJobs';
import TopFreelancers from '../src/components/home/TopFreelancers';
import CategoryBrowser from '../src/components/home/CategoryBrowser';
import HowItWorksPreview from '../src/components/home/HowItWorksPreview';
import CTASection from '../src/components/home/CTASection';
import { fadeInUp, staggerContainer, staggerChild } from '../src/utils/animations';

const MotionBox = motion.create(Box);

const trustBadges = [
  { icon: Lock, label: 'Trustless Escrow' },
  { icon: Speed, label: '<1s Settlement' },
  { icon: PublicOutlined, label: '0% Platform Fees' },
];

export default function Home() {
  const router = useRouter();

  return (
    <Layout>
      <Box>
        {/* Hero Section */}
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 60%)',
            borderBottom: '1px solid rgba(0,255,195,0.06)',
          }}
        >
          {/* Ambient grid */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(0,255,195,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,255,195,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              pointerEvents: 'none',
              maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.6) 70%, transparent 100%)',
            }}
          />

          <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 1 }}>
            <Grid container spacing={4} alignItems="center">
              {/* Left: Text */}
              <Grid size={{ xs: 12, md: 7 }}>
                <MotionBox
                  variants={fadeInUp}
                  initial="initial"
                  animate="animate"
                  sx={{ display: 'flex', mb: 3 }}
                >
                  <Logo size={52} />
                </MotionBox>

                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <Typography
                    variant="h1"
                    fontWeight={700}
                    sx={{
                      fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                      lineHeight: 1.1,
                      mb: 1,
                    }}
                  >
                    Decentralized
                  </Typography>
                  <Typography
                    variant="h1"
                    fontWeight={700}
                    sx={{
                      fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                      lineHeight: 1.1,
                      mb: 3,
                    }}
                  >
                    Freelance on{' '}
                    <Box
                      component="span"
                      sx={{
                        background: 'linear-gradient(135deg, #00ffc3 0%, #9945ff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Solana
                    </Box>
                  </Typography>
                </MotionBox>

                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ mb: 4, maxWidth: 520, fontWeight: 400, lineHeight: 1.7 }}
                  >
                    Smart contract escrow. On-chain reputation. Instant settlement.
                    Connect directly — no middleman, no platform fees.
                  </Typography>
                </MotionBox>

                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForward />}
                      onClick={() => router.push('/jobs')}
                      sx={{ px: 4 }}
                    >
                      Browse Jobs
                    </Button>
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => router.push('/jobs/create')}
                      sx={{ px: 4 }}
                    >
                      Post a Job
                    </Button>
                  </Box>

                  {/* Trust badges */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {trustBadges.map((badge) => (
                      <Box
                        key={badge.label}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          px: 1.5, py: 0.5,
                          border: '1px solid rgba(0,255,195,0.2)',
                          borderRadius: 10,
                          bgcolor: 'rgba(0,255,195,0.04)',
                        }}
                      >
                        <badge.icon sx={{ fontSize: 14, color: '#00ffc3' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          {badge.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </MotionBox>
              </Grid>

              {/* Right: Terminal preview */}
              <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                <MotionBox
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <Box
                    sx={{
                      border: '1px solid rgba(0,255,195,0.15)',
                      borderRadius: 2,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      overflow: 'hidden',
                      fontFamily: 'monospace',
                      fontSize: '0.78rem',
                    }}
                  >
                    {/* Terminal header */}
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 2, py: 1.25,
                        borderBottom: '1px solid rgba(0,255,195,0.08)',
                        bgcolor: 'rgba(0,255,195,0.03)',
                      }}
                    >
                      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                        <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />
                      ))}
                      <Typography
                        variant="caption"
                        sx={{ ml: 1, color: 'text.secondary', fontFamily: 'monospace' }}
                      >
                        freelancechain.sol
                      </Typography>
                    </Box>
                    {/* Terminal body */}
                    <Box sx={{ p: 2.5, lineHeight: 2 }}>
                      {[
                        { label: '$ program.methods', color: '#00ffc3' },
                        { label: '  .postJob(budget, title)', color: '#8084ee' },
                        { label: '  .accounts({ escrow, client })', color: '#8084ee' },
                        { label: '  .rpc()', color: '#8084ee' },
                        { label: '', color: 'transparent' },
                        { label: '✓ Job posted on-chain', color: '#4caf50' },
                        { label: '✓ Escrow initialized', color: '#4caf50' },
                        { label: '✓ Awaiting bids...', color: '#ff9500' },
                        { label: '', color: 'transparent' },
                        { label: '> tx: 3xKpQr...7mNs', color: 'rgba(255,255,255,0.3)' },
                        { label: '> fee: 0.000005 SOL', color: 'rgba(255,255,255,0.3)' },
                      ].map((line, i) => (
                        <Box key={i} sx={{ color: line.color, whiteSpace: 'pre' }}>
                          {line.label}
                        </Box>
                      ))}
                      <Box
                        sx={{
                          display: 'inline-block',
                          width: 8, height: 16,
                          bgcolor: '#00ffc3',
                          verticalAlign: 'middle',
                          animation: 'blink 1.2s step-end infinite',
                          '@keyframes blink': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0 },
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </MotionBox>
              </Grid>
            </Grid>

            {/* Stats */}
            <Box sx={{ mt: { xs: 6, md: 8 } }}>
              <HomeStats />
            </Box>
          </Container>
        </Box>

        {/* Trending Jobs */}
        <Box sx={{ bgcolor: 'background.paper', py: 10 }}>
          <TrendingJobs />
        </Box>

        {/* Categories */}
        <Box sx={{ py: 10 }}>
          <CategoryBrowser />
        </Box>

        {/* How It Works */}
        <Box sx={{ bgcolor: 'background.paper', py: 10 }}>
          <HowItWorksPreview />
        </Box>

        {/* Top Freelancers */}
        <Box sx={{ py: 10 }}>
          <TopFreelancers />
        </Box>

        {/* CTA Section */}
        <Box sx={{ bgcolor: 'background.paper', py: 10 }}>
          <CTASection />
        </Box>
      </Box>
    </Layout>
  );
}
