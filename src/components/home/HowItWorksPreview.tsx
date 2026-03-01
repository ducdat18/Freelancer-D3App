import { Container, Typography, Box, Button, Grid, Card, CardContent } from '@mui/material';
import { WorkOutline, Lock, Paid, ArrowForward } from '@mui/icons-material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

const steps = [
  {
    icon: WorkOutline,
    number: '01',
    title: 'Post or Find a Job',
    description: 'Clients post jobs with SOL budgets. Freelancers browse and submit competitive bids with on-chain reputation.',
    accent: '#00ffc3',
    detail: 'Budget locked on bid acceptance',
  },
  {
    icon: Lock,
    number: '02',
    title: 'Smart Contract Escrow',
    description: 'Funds lock in a Solana smart contract the moment a bid is accepted. Neither party can touch them unilaterally.',
    accent: '#ff9500',
    detail: 'Zero custody risk',
  },
  {
    icon: Paid,
    number: '03',
    title: 'Instant Payment',
    description: 'Work approved? Funds release in seconds directly to the freelancer\'s wallet. No delays, no fees, no middleman.',
    accent: '#4caf50',
    detail: '~$0.0005 transaction fee',
  },
];

export default function HowItWorksPreview() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 7 }}>
        <Typography
          variant="overline"
          sx={{
            color: '#00ffc3',
            letterSpacing: 4,
            fontSize: '0.62rem',
            fontFamily: '"Orbitron", monospace',
            display: 'block',
            mb: 1.5,
          }}
        >
          THE PROTOCOL
        </Typography>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          How It Works
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>
          Three steps to trustless, decentralized freelancing — no middleman required.
        </Typography>
      </Box>

      <MotionBox
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.3 }}
      >
        <Grid container spacing={3} sx={{ position: 'relative' }}>
          {/* Connecting line */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: '72px',
              left: '22%',
              right: '22%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0,255,195,0.25), rgba(0,255,195,0.25), transparent)',
              zIndex: 0,
            }}
          />

          {steps.map((step) => (
            <Grid size={{ xs: 12, md: 4 }} key={step.number}>
              <MotionCard
                variants={staggerChild}
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                  border: '1px solid rgba(0,255,195,0.08)',
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    borderColor: `${step.accent}30`,
                    boxShadow: `0 0 30px ${step.accent}0a`,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  {/* Icon circle */}
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      border: `2px solid ${step.accent}50`,
                      bgcolor: `${step.accent}08`,
                      boxShadow: `0 0 20px ${step.accent}15`,
                      position: 'relative',
                    }}
                  >
                    <step.icon sx={{ fontSize: 32, color: step.accent }} />
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        bgcolor: step.accent,
                        color: 'background.default',
                        fontFamily: '"Orbitron", sans-serif',
                        fontWeight: 700,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.62rem',
                      }}
                    >
                      {step.number}
                    </Typography>
                  </Box>

                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 280, mx: 'auto', mb: 2, lineHeight: 1.7 }}
                  >
                    {step.description}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-block',
                      px: 1.5, py: 0.4,
                      border: `1px solid ${step.accent}30`,
                      borderRadius: 1,
                      bgcolor: `${step.accent}06`,
                      color: step.accent,
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                    }}
                  >
                    {step.detail}
                  </Box>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </MotionBox>

      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Button
          component={Link}
          href="/how-it-works"
          variant="outlined"
          endIcon={<ArrowForward />}
        >
          Full Protocol Overview
        </Button>
      </Box>
    </Container>
  );
}
