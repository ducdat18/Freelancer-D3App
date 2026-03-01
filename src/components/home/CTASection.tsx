import { Container, Typography, Box, Button, Grid, Card, CardContent } from '@mui/material';
import { Work, Person, AccountBalanceWallet, ArrowForward } from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { fadeInUp } from '../../utils/animations';

const MotionBox = motion.create(Box);

export default function CTASection() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  if (connected) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your wallet is connected. Choose your path.
          </Typography>
        </Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                height: '100%',
                border: '1px solid rgba(0,255,195,0.15)',
                background: 'linear-gradient(135deg, rgba(0,255,195,0.05) 0%, rgba(0,255,195,0.01) 100%)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'rgba(0,255,195,0.3)',
                  boxShadow: '0 0 40px rgba(0,255,195,0.08)',
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
                <Box
                  sx={{
                    width: 64, height: 64,
                    borderRadius: '50%',
                    border: '2px solid rgba(0,255,195,0.3)',
                    bgcolor: 'rgba(0,255,195,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: 'auto', mb: 3,
                    boxShadow: '0 0 20px rgba(0,255,195,0.12)',
                  }}
                >
                  <Work sx={{ fontSize: 30, color: '#00ffc3' }} />
                </Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Looking to Hire?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                  Post a job and find the perfect freelancer. Funds go into escrow automatically.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => router.push('/jobs/create')}
                >
                  Post a Job
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                height: '100%',
                border: '1px solid rgba(128,132,238,0.15)',
                background: 'linear-gradient(135deg, rgba(128,132,238,0.05) 0%, rgba(128,132,238,0.01) 100%)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'rgba(128,132,238,0.3)',
                  boxShadow: '0 0 40px rgba(128,132,238,0.08)',
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
                <Box
                  sx={{
                    width: 64, height: 64,
                    borderRadius: '50%',
                    border: '2px solid rgba(128,132,238,0.3)',
                    bgcolor: 'rgba(128,132,238,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: 'auto', mb: 3,
                    boxShadow: '0 0 20px rgba(128,132,238,0.12)',
                  }}
                >
                  <Person sx={{ fontSize: 30, color: '#8084ee' }} />
                </Box>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Looking for Work?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                  Browse open jobs, submit bids, and earn crypto for your skills — instantly.
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => router.push('/jobs')}
                >
                  Browse Jobs
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <MotionBox
        variants={fadeInUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <Box
          sx={{
            textAlign: 'center',
            p: { xs: 4, md: 7 },
            border: '1px solid rgba(0,255,195,0.15)',
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(0,255,195,0.04) 0%, rgba(153,69,255,0.04) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,255,195,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                width: 72, height: 72,
                borderRadius: '50%',
                border: '2px solid rgba(0,255,195,0.3)',
                bgcolor: 'rgba(0,255,195,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
                boxShadow: '0 0 30px rgba(0,255,195,0.15)',
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 36, color: '#00ffc3' }} />
            </Box>

            <Typography variant="h3" fontWeight={700} gutterBottom>
              Ready to Get Started?
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 460, mx: 'auto', lineHeight: 1.7 }}
            >
              Connect your Solana wallet to start posting jobs, bidding on projects,
              and earning crypto — all without a middleman.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AccountBalanceWallet />}
              onClick={() => setVisible(true)}
              sx={{ px: 5, py: 1.5 }}
            >
              Connect Wallet
            </Button>
          </Box>
        </Box>
      </MotionBox>
    </Container>
  );
}
