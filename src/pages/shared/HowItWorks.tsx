import { Container, Typography, Box, Grid, Card, CardContent, Chip } from '@mui/material';
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

const escrowFlow = [
  { label: 'Client Posts Job', color: '#00ffc3' },
  null,
  { label: 'Bid Accepted', color: '#00ffc3' },
  null,
  { label: 'Funds → Escrow', color: '#ff9500', highlight: true },
  null,
  { label: 'Work Submitted', color: '#00ffc3' },
  null,
  { label: 'Payment Released', color: '#4caf50' },
];

export default function HowItWorks() {
  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, rgba(0,255,195,0.04) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(0,255,195,0.08)',
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
              color: '#00ffc3',
              borderColor: 'rgba(0,255,195,0.3)',
              bgcolor: 'rgba(0,255,195,0.05)',
              mb: 3,
            }}
          />
          <Typography
            variant="h2"
            fontWeight={700}
            sx={{
              background: 'linear-gradient(135deg, #fff 0%, #00ffc3 60%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              fontFamily: '"Orbitron", sans-serif',
              fontSize: { xs: '2rem', md: '3rem' },
            }}
          >
            How It Works
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ maxWidth: 560, mx: 'auto', fontWeight: 400, lineHeight: 1.7 }}
          >
            A trustless, peer-to-peer freelance protocol built entirely on Solana smart contracts.
            No intermediary. No permission required.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>

        {/* Escrow Flow */}
        <Box sx={{ mb: 10 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
            The Escrow Flow
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Funds are held by the smart contract — not by Lancer Lab, not by any third party.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              p: 3,
              border: '1px solid rgba(0,255,195,0.1)',
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.3)',
              fontFamily: 'monospace',
            }}
          >
            {escrowFlow.map((step, i) =>
              step === null ? (
                <Box
                  key={i}
                  sx={{ color: 'rgba(0,255,195,0.35)', fontSize: 18, userSelect: 'none', mx: 0.5 }}
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
                    border: `1px solid ${step.color}40`,
                    bgcolor: step.highlight ? `${step.color}18` : `${step.color}08`,
                    color: step.color,
                    fontSize: '0.8rem',
                    fontWeight: step.highlight ? 700 : 500,
                    whiteSpace: 'nowrap',
                    boxShadow: step.highlight ? `0 0 10px ${step.color}25` : 'none',
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
                  bgcolor: 'rgba(0,255,195,0.08)',
                  border: '1px solid rgba(0,255,195,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <WorkIcon sx={{ color: '#00ffc3', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.62rem', display: 'block', lineHeight: 1.2 }}
                >
                  FOR CLIENTS
                </Typography>
                <Typography variant="h5" fontWeight={700}>
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
                        width: '1px',
                        bgcolor: 'rgba(0,255,195,0.1)',
                        zIndex: 0,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: '1px solid rgba(0,255,195,0.35)',
                      bgcolor: 'background.paper',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                      fontFamily: '"Orbitron", monospace',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#00ffc3',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box sx={{ pb: 3.5 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
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
                  bgcolor: 'rgba(128,132,238,0.08)',
                  border: '1px solid rgba(128,132,238,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <PersonIcon sx={{ color: '#8084ee', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography
                  variant="overline"
                  sx={{ color: '#8084ee', letterSpacing: 3, fontSize: '0.62rem', display: 'block', lineHeight: 1.2 }}
                >
                  FOR FREELANCERS
                </Typography>
                <Typography variant="h5" fontWeight={700}>
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
                        width: '1px',
                        bgcolor: 'rgba(128,132,238,0.1)',
                        zIndex: 0,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      width: 40, height: 40,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: '1px solid rgba(128,132,238,0.35)',
                      bgcolor: 'background.paper',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                      fontFamily: '"Orbitron", monospace',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color: '#8084ee',
                    }}
                  >
                    {step.number}
                  </Box>
                  <Box sx={{ pb: 3.5 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
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
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Why Decentralized?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The advantages of removing the platform from every transaction.
            </Typography>
          </Box>
          <MotionBox
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.2 }}
          >
            <Grid container spacing={2}>
              {whyCards.map((item) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.title}>
                  <MotionCard
                    variants={staggerChild}
                    sx={{
                      height: '100%',
                      border: '1px solid rgba(0,255,195,0.08)',
                      transition: 'all 0.25s ease',
                      '&:hover': {
                        borderColor: 'rgba(0,255,195,0.22)',
                        boxShadow: '0 0 24px rgba(0,255,195,0.06)',
                        transform: 'translateY(-3px)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <item.icon
                        sx={{
                          fontSize: 30,
                          color: '#00ffc3',
                          mb: 1.5,
                          filter: 'drop-shadow(0 0 5px rgba(0,255,195,0.35))',
                        }}
                      />
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
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
