import {
  Container, Box, Typography, Grid, Card, CardContent, Chip, Divider,
} from '@mui/material'
import {
  Shield, Speed, PublicOutlined, LockOutlined,
  AccountBalanceWallet, Code, GavelOutlined, StarOutlined,
} from '@mui/icons-material'
import Layout from '../src/components/Layout'
import { motion } from 'framer-motion'
import { staggerContainer, staggerChild, fadeInUp } from '../src/utils/animations'

const MotionBox = motion.create(Box)
const MotionCard = motion.create(Card)

const features = [
  {
    icon: Shield,
    title: 'Trustless Escrow',
    desc: 'Funds lock in a Solana smart contract on bid acceptance. Payment releases only on work approval — zero human custody.',
  },
  {
    icon: Speed,
    title: 'Sub-Second Settlement',
    desc: 'Solana finalizes transactions in ~400ms with fees under $0.001. No waiting for bank wires or platform processing.',
  },
  {
    icon: PublicOutlined,
    title: 'Permissionless & Global',
    desc: 'Anyone with a wallet can participate. No country restrictions, no KYC, no approval process — ever.',
  },
  {
    icon: StarOutlined,
    title: 'On-Chain Reputation',
    desc: 'Ratings and completed job counts live on-chain permanently. Your reputation is yours — it follows your wallet forever.',
  },
  {
    icon: AccountBalanceWallet,
    title: 'SOL Payments',
    desc: 'Pay and receive in native SOL. Fast, cheap, and self-custodied from the moment payment releases.',
  },
  {
    icon: GavelOutlined,
    title: 'Dispute Resolution',
    desc: 'Disputes are raised on-chain and resolved through protocol arbitration — no opaque platform decisions.',
  },
]

const stack = [
  { label: 'Solana', color: '#9945ff' },
  { label: 'Anchor', color: '#00ffc3' },
  { label: 'Next.js', color: '#fff' },
  { label: 'TypeScript', color: '#3178c6' },
  { label: 'React Query', color: '#ff4154' },
  { label: 'MUI', color: '#0081cb' },
  { label: 'IPFS', color: '#65c2cb' },
  { label: 'Framer Motion', color: '#bb4bff' },
]

const protocolStats = [
  { value: '0%', label: 'Platform Fees' },
  { value: '<1s', label: 'Settlement Time' },
  { value: '100%', label: 'On-Chain' },
  { value: '∞', label: 'Permissionless' },
]

export default function AboutPage() {
  return (
    <Layout>
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
              label="// ABOUT THE PROTOCOL"
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
              About FreelanceChain
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto', fontWeight: 400, lineHeight: 1.7, mb: 5 }}
            >
              A decentralized freelance marketplace built on Solana — where contracts are code,
              payments are instant, and trust is mathematically guaranteed.
            </Typography>

            {/* Protocol Stats */}
            <Grid container spacing={2} justifyContent="center">
              {protocolStats.map((stat) => (
                <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid rgba(0,255,195,0.12)',
                      borderRadius: 2,
                      bgcolor: 'rgba(0,255,195,0.03)',
                    }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{
                        fontFamily: '"Orbitron", sans-serif',
                        color: '#00ffc3',
                        filter: 'drop-shadow(0 0 8px rgba(0,255,195,0.4))',
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 8 }}>

          {/* Mission */}
          <Grid container spacing={4} sx={{ mb: 10 }} alignItems="stretch">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 3,
                  border: '1px solid rgba(255,80,80,0.15)',
                  borderRadius: 2,
                  bgcolor: 'rgba(255,80,80,0.03)',
                  height: '100%',
                  fontFamily: 'monospace',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: '#ff5050', letterSpacing: 3, fontSize: '0.62rem', display: 'block', mb: 2 }}
                >
                  THE PROBLEM
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
                  Traditional freelance platforms sit in the middle of every transaction — taking 10–20% fees,
                  holding your funds for weeks, and arbitrarily suspending accounts.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  They monetize your reputation data while you do all the work. Your ratings belong to
                  the platform, not to you. Delete your account and you lose everything.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 3,
                  border: '1px solid rgba(0,255,195,0.15)',
                  borderRadius: 2,
                  bgcolor: 'rgba(0,255,195,0.03)',
                  height: '100%',
                  fontFamily: 'monospace',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.62rem', display: 'block', mb: 2 }}
                >
                  THE SOLUTION
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ lineHeight: 1.8 }}>
                  FreelanceChain removes the middleman entirely. Smart contracts handle escrow, dispute
                  resolution, and payments — all verifiable on-chain.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  Your reputation lives on-chain and belongs to your wallet address. The platform earns
                  nothing from your work. The code is the contract.
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ mb: 8, borderColor: 'rgba(0,255,195,0.06)' }} />

          {/* Features */}
          <Box sx={{ mb: 10 }}>
            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Core Protocol Features
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Everything built on smart contracts — verifiable, auditable, unstoppable.
              </Typography>
            </Box>
            <MotionBox
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, amount: 0.1 }}
            >
              <Grid container spacing={2}>
                {features.map((f) => (
                  <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
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
                        <f.icon
                          sx={{
                            fontSize: 32,
                            color: '#00ffc3',
                            mb: 1.5,
                            filter: 'drop-shadow(0 0 6px rgba(0,255,195,0.35))',
                          }}
                        />
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          {f.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                          {f.desc}
                        </Typography>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Box>

          <Divider sx={{ mb: 8, borderColor: 'rgba(0,255,195,0.06)' }} />

          {/* Tech Stack */}
          <Box sx={{ mb: 8 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Tech Stack
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Built with battle-tested open-source infrastructure.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {stack.map((s) => (
                <Box
                  key={s.label}
                  sx={{
                    px: 2,
                    py: 0.75,
                    border: `1px solid ${s.color}30`,
                    borderRadius: 1.5,
                    bgcolor: `${s.color}08`,
                    color: s.color,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: `${s.color}15`,
                      boxShadow: `0 0 10px ${s.color}20`,
                    },
                  }}
                >
                  {s.label}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Status */}
          <Box
            sx={{
              p: 3,
              border: '1px solid rgba(0,255,195,0.12)',
              borderRadius: 2,
              bgcolor: 'rgba(0,0,0,0.3)',
              fontFamily: 'monospace',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: '#00ffc3',
                  boxShadow: '0 0 8px #00ffc3',
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.3 },
                  },
                }}
              />
              <Typography
                variant="overline"
                sx={{ color: '#00ffc3', letterSpacing: 3, fontSize: '0.62rem' }}
              >
                DEPLOYMENT STATUS
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Currently Running on Solana Devnet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              FreelanceChain is live on <strong style={{ color: '#00ffc3' }}>Solana Devnet</strong> for
              testing and development. Smart contracts are undergoing audit before mainnet deployment.
              Connect a Devnet wallet to explore all features with test SOL — everything is fully functional.
            </Typography>
          </Box>

        </Container>
      </Box>
    </Layout>
  )
}
