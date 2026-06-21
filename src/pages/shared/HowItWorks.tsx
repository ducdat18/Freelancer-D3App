import { Container, Typography, Box, Grid, Card, CardContent, Chip, useTheme, alpha } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import PaidIcon from '@mui/icons-material/Paid';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import SpeedIcon from '@mui/icons-material/Speed';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { motion } from 'framer-motion';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

const clientSteps = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    desc: 'Link your Phantom, Solflare, or any Solana wallet. No email, no password — just your keys.',
    icon: AccountBalanceWalletIcon,
  },
  {
    number: '02',
    title: 'Post a Job',
    desc: 'Describe the project, set your SOL budget, choose a category, and define requirements.',
    icon: WorkIcon,
  },
  {
    number: '03',
    title: 'Review Bids',
    desc: 'Freelancers submit competitive proposals. Check on-chain reputation and completed job counts.',
    icon: PersonIcon,
  },
  {
    number: '04',
    title: 'Funds Enter Escrow',
    desc: 'Once you accept a bid, the budget locks in a smart contract. No one can access it — not even us.',
    icon: LockIcon,
  },
  {
    number: '05',
    title: 'Approve & Pay',
    desc: 'Review the submitted work. Approve to release payment instantly, or raise a dispute if needed.',
    icon: CheckCircleIcon,
  },
];

const freelancerSteps = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    desc: 'Your wallet address is your identity. Reputation is stored on-chain and follows you forever.',
    icon: AccountBalanceWalletIcon,
  },
  {
    number: '02',
    title: 'Browse Open Jobs',
    desc: 'Explore jobs by category, budget range, or recency. Filter by skills that match your expertise.',
    icon: WorkIcon,
  },
  {
    number: '03',
    title: 'Submit a Bid',
    desc: 'Send your proposal and pricing. Clients see your on-chain job count and rating — no faking it.',
    icon: PersonIcon,
  },
  {
    number: '04',
    title: 'Deliver the Work',
    desc: 'Once selected, payment is already locked in escrow. Deliver quality work and submit for review.',
    icon: CheckCircleIcon,
  },
  {
    number: '05',
    title: 'Get Paid Instantly',
    desc: 'On approval, SOL releases directly to your wallet in seconds. No waiting, no fees, no limits.',
    icon: PaidIcon,
  },
];

const whyCards = [
  {
    icon: PaidIcon,
    title: '0% Platform Fee',
    desc: 'Traditional platforms take 10–20% of earnings. Lancer Lab takes nothing — the protocol is the middleman.',
  },
  {
    icon: ShieldIcon,
    title: 'Immutable Reputation',
    desc: 'Your job history and ratings are stored on-chain. No one can delete them or ban your account.',
  },
  {
    icon: PublicOutlinedIcon,
    title: 'Global Payments',
    desc: 'Receive SOL anywhere in the world in under 1 second. No banks, no borders, no wire delays.',
  },
  {
    icon: GavelIcon,
    title: 'On-Chain Disputes',
    desc: 'Disagreements are resolved through protocol arbitration. Smart contracts enforce outcomes objectively.',
  },
  {
    icon: SpeedIcon,
    title: 'Sub-Cent Fees',
    desc: 'Solana transactions cost ~$0.0005. Send and receive payments without worrying about gas.',
  },
  {
    icon: LockIcon,
    title: 'Transparent Contracts',
    desc: 'Every rule is code. Read the smart contract source, verify the logic, and trust the math.',
  },
];

export default function HowItWorks() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const escrowFlow = [
    { label: 'Client Posts Job', color: primaryMain },
    null,
    { label: 'Bid Accepted', color: primaryMain },
    null,
    { label: 'Funds → Escrow', color: theme.palette.warning.main, highlight: true },
    null,
    { label: 'Work Submitted', color: primaryMain },
    null,
    { label: 'Payment Released', color: theme.palette.success.main },
  ];

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          background: isDark 
            ? 'linear-gradient(180deg, rgba(0,255,195,0.04) 0%, transparent 100%)'
            : `linear-gradient(180deg, ${alpha(primaryMain, 0.08)} 0%, transparent 100%)`,
          borderBottom: 1,
          borderColor: 'divider',
          py: { xs: 6, md: 9 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Chip
            label="// PROTOCOL OVERVIEW"
            size="small"
            variant="outlined"
            sx={{
              fontFamily: '"Orbitron", monospace',
              fontSize: '0.62rem',
              letterSpacing: 3,
              color: primaryMain,
              borderColor: alpha(primaryMain, 0.3),
              bgcolor: isDark ? alpha(primaryMain, 0.05) : alpha(primaryMain, 0.03),
              mb: 3,
              fontWeight: 700,
            }}
          />
          <Typography
            variant="h2"
            fontWeight={800}
            sx={{
              background: isDark
                ? `linear-gradient(135deg, #fff 0%, ${primaryMain} 60%)`
                : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${primaryMain} 60%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              fontFamily: '"Orbitron", sans-serif',
              fontSize: { xs: '2rem', md: '3rem' },
              letterSpacing: 1,
            }}
          >
            How It Works
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: 560, mx: 'auto', fontWeight: 500, lineHeight: 1.7 }}
          >
            A trustless, peer-to-peer freelance protocol built entirely on Solana smart contracts.
            No intermediary. No permission required.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>

        {/* Escrow Flow */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 1, fontFamily: '"Orbitron", sans-serif' }}>
            The Escrow Flow
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
            Funds are held by the smart contract — not by Lancer Lab, not by any third party.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              p: 3,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(0,0,0,0.3)' : alpha(primaryMain, 0.02),
              fontFamily: 'monospace',
            }}
          >
            {escrowFlow.map((step, i) =>
              step === null ? (
                <Box
                  key={i}
                  sx={{ color: 'text.disabled', fontSize: 18, userSelect: 'none', mx: 0.5, fontWeight: 800 }}
                >
                  →
                </Box>
              ) : (
                <Box
                  key={i}
                  sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: 1,
                    border: 1,
                    borderColor: alpha(step.color, 0.4),
                    bgcolor: step.highlight ? alpha(step.color, 0.15) : alpha(step.color, 0.05),
                    color: step.color,
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    boxShadow: step.highlight ? (isDark ? `0 0 10px ${alpha(step.color, 0.25)}` : 'none') : 'none',
                  }}
                >
                  {step.label}
                </Box>
              )
            )}
          </Box>
        </Box>

        {/* Client + Freelancer Steps */}
        <Grid container spacing={{ xs: 6, md: 8 }} sx={{ mb: 10 }}>
          {/* For Clients */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 42, height: 42, borderRadius: 1.5,
                  bgcolor: isDark ? alpha(primaryMain, 0.08) : alpha(primaryMain, 0.05),
                  border: 1,
                  borderColor: alpha(primaryMain, 0.25),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <WorkIcon sx={{ color: primaryMain, fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.62rem', display: 'block', lineHeight: 1.2, fontWeight: 700 }}
                >
                  FOR CLIENTS
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
                  Post &amp; Hire
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {clientSteps.map((step, idx) => (
                <Box key={step.number} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                  {idx < clientSteps.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 19,
                        top: 42,
                        bottom: 0,
                        width: '2px',
                        bgcolor: 'divider',
                        opacity: 0.5,
                        zIndex: 0,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: 2,
                      borderColor: primaryMain,
                      bgcolor: 'background.paper',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                      fontFamily: '"Orbitron", monospace',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: primaryMain,
                      boxShadow: isDark ? `0 0 10px ${alpha(primaryMain, 0.3)}` : 'none',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box sx={{ pb: 3.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
                      {step.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>

          {/* For Freelancers */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 42, height: 42, borderRadius: 1.5,
                  bgcolor: isDark ? alpha(secondaryMain, 0.08) : alpha(secondaryMain, 0.05),
                  border: 1,
                  borderColor: alpha(secondaryMain, 0.25),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <PersonIcon sx={{ color: secondaryMain, fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: secondaryMain, letterSpacing: 3, fontSize: '0.62rem', display: 'block', lineHeight: 1.2, fontWeight: 700 }}
                >
                  FOR FREELANCERS
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
                  Bid &amp; Earn
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {freelancerSteps.map((step, idx) => (
                <Box key={step.number} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                  {idx < freelancerSteps.length - 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 19,
                        top: 42,
                        bottom: 0,
                        width: '2px',
                        bgcolor: 'divider',
                        opacity: 0.5,
                        zIndex: 0,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: 2,
                      borderColor: secondaryMain,
                      bgcolor: 'background.paper',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                      fontFamily: '"Orbitron", monospace',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: secondaryMain,
                      boxShadow: isDark ? `0 0 10px ${alpha(secondaryMain, 0.3)}` : 'none',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box sx={{ pb: 3.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
                      {step.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* Why Decentralized */}
        <Box>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight={800} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif' }}>
              Why Decentralized?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
              The advantages of removing the platform from every transaction.
            </Typography>
          </Box>
          <MotionBox
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            <Grid container spacing={3}>
              {whyCards.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.title}>
                  <MotionCard
                    variants={staggerChild}
                    sx={{
                      height: '100%',
                      border: 1,
                      borderColor: 'divider',
                      transition: 'all 0.25s ease',
                      backgroundImage: 'none',
                      '&:hover': {
                        borderColor: primaryMain,
                        boxShadow: isDark ? `0 0 24px ${alpha(primaryMain, 0.1)}` : '0 8px 24px rgba(0,0,0,0.05)',
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <item.icon
                        sx={{
                          fontSize: 32,
                          color: primaryMain,
                          mb: 2,
                          filter: isDark ? `drop-shadow(0 0 5px ${alpha(primaryMain, 0.5)})` : 'none',
                        }}
                      />
                      <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ fontFamily: '"Orbitron", sans-serif', fontSize: '0.9rem' }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontWeight: 500 }}>
                        {item.desc}
                      </Typography>
                    </CardContent>
                  </MotionCard>
                </Grid>
              ))}
            </Grid>
          </MotionBox>
        </Box>

      </Container>
    </Box>
  );
}
