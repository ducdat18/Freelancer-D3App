import { Container, Typography, Box, Button, Grid, Card, CardContent, useTheme } from '@mui/material';
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

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
                border: 1,
                borderColor: 'divider',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(0,255,195,0.05) 0%, rgba(0,255,195,0.01) 100%)'
                  : `linear-gradient(135deg, ${primaryMain}10 0%, ${primaryMain}02 100%)`,
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: isDark ? 'rgba(0,255,195,0.3)' : `${primaryMain}80`,
                  boxShadow: isDark ? '0 0 40px rgba(0,255,195,0.08)' : `0 8px 30px ${primaryMain}15`,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
                <Box
                  sx={{
                    width: 64, height: 64,
                    borderRadius: '50%',
                    border: `2px solid ${isDark ? 'rgba(0,255,195,0.3)' : primaryMain + '40'}`,
                    bgcolor: isDark ? 'rgba(0,255,195,0.08)' : `${primaryMain}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: 'auto', mb: 3,
                    boxShadow: isDark ? '0 0 20px rgba(0,255,195,0.12)' : `0 4px 15px ${primaryMain}20`,
                  }}
                >
                  <Work sx={{ fontSize: 30, color: primaryMain }} />
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
                border: 1,
                borderColor: 'divider',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(128,132,238,0.05) 0%, rgba(128,132,238,0.01) 100%)'
                  : `linear-gradient(135deg, ${secondaryMain}10 0%, ${secondaryMain}02 100%)`,
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: isDark ? 'rgba(128,132,238,0.3)' : `${secondaryMain}80`,
                  boxShadow: isDark ? '0 0 40px rgba(128,132,238,0.08)' : `0 8px 30px ${secondaryMain}15`,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
                <Box
                  sx={{
                    width: 64, height: 64,
                    borderRadius: '50%',
                    border: `2px solid ${isDark ? 'rgba(128,132,238,0.3)' : secondaryMain + '40'}`,
                    bgcolor: isDark ? 'rgba(128,132,238,0.08)' : `${secondaryMain}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mx: 'auto', mb: 3,
                    boxShadow: isDark ? '0 0 20px rgba(128,132,238,0.12)' : `0 4px 15px ${secondaryMain}20`,
                  }}
                >
                  <Person sx={{ fontSize: 30, color: secondaryMain }} />
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
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(0,255,195,0.04) 0%, rgba(153,69,255,0.04) 100%)'
              : `linear-gradient(135deg, ${primaryMain}08 0%, ${theme.palette.error.main}05 100%)`,
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
              background: isDark ? 'radial-gradient(circle, rgba(0,255,195,0.06) 0%, transparent 70%)' : `radial-gradient(circle, ${primaryMain}10 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box
              sx={{
                width: 72, height: 72,
                borderRadius: '50%',
                border: `2px solid ${isDark ? 'rgba(0,255,195,0.3)' : primaryMain + '40'}`,
                bgcolor: isDark ? 'rgba(0,255,195,0.08)' : `${primaryMain}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 3,
                boxShadow: isDark ? '0 0 30px rgba(0,255,195,0.15)' : `0 4px 20px ${primaryMain}20`,
              }}
            >
              <AccountBalanceWallet sx={{ fontSize: 36, color: primaryMain }} />
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
