import {
  Container, Box, Typography, Grid, Card, CardContent, Chip, Divider, useTheme, alpha,
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
    accent: '#00ffc3',
    detail: 'SPL-TOKEN ESCROW',
  },
  {
    icon: Speed,
    title: 'Sub-Second Settlement',
    desc: 'Solana finalizes transactions in ~400ms with fees under $0.001. No waiting for bank wires or platform processing.',
    accent: '#9945ff',
    detail: '400ms FINALITY',
  },
  {
    icon: PublicOutlined,
    title: 'Permissionless & Global',
    desc: 'Anyone with a wallet can participate. No country restrictions, no KYC, no approval process — ever.',
    accent: '#00ffc3',
    detail: 'NO KYC REQUIRED',
  },
  {
    icon: StarOutlined,
    title: 'On-Chain Reputation',
    desc: 'Ratings and completed job counts live on-chain permanently. Your reputation is yours — it follows your wallet forever.',
    accent: '#febc2e',
    detail: 'NFT/PDA REPUTATION',
  },
  {
    icon: AccountBalanceWallet,
    title: 'SOL Payments',
    desc: 'Pay and receive in native SOL. Fast, cheap, and self-custodied from the moment payment releases.',
    accent: '#9945ff',
    detail: 'DIRECT SETTLEMENT',
  },
  {
    icon: GavelOutlined,
    title: 'Dispute Resolution',
    desc: 'Disputes are raised on-chain and resolved through protocol arbitration — no opaque platform decisions.',
    accent: '#ff5f57',
    detail: 'ON-CHAIN ARBITRATION',
  },
]

const protocolStats = [
  { value: '0%', label: 'Platform Fees' },
  { value: '<1s', label: 'Settlement Time' },
  { value: '100%', label: 'On-Chain' },
  { value: '∞', label: 'Permissionless' },
]

export default function AboutPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;
  const errorMain = theme.palette.error.main;

  const stack = [
    { label: 'Solana', color: '#9945ff' },
    { label: 'Anchor', color: primaryMain },
    { label: 'Next.js', color: isDark ? '#fff' : '#000' },
    { label: 'TypeScript', color: '#3178c6' },
    { label: 'React Query', color: '#ff4154' },
    { label: 'MUI', color: '#0081cb' },
    { label: 'IPFS', color: '#65c2cb' },
    { label: 'Framer Motion', color: '#bb4bff' },
  ]

  return (
    <Layout>
      <Box sx={{ overflow: 'hidden' }}>
        {/* Hero */}
        <Box
          sx={{
            position: 'relative',
            background: `linear-gradient(180deg, ${alpha(primaryMain, isDark ? 0.04 : 0.02)} 0%, transparent 100%)`,
            borderBottom: 1,
            borderColor: alpha(primaryMain, 0.08),
            py: { xs: 8, md: 12 },
            textAlign: 'center',
          }}
        >
          {/* Ambient grid */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: isDark ? `
                linear-gradient(rgba(0,255,195,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,255,195,0.03) 1px, transparent 1px)
              ` : `
                linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
              pointerEvents: 'none',
              maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,1) 50%, transparent 100%)',
            }}
          />

          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Chip
              label="// ABOUT THE PROTOCOL"
              size="small"
              variant="outlined"
              sx={{
                fontFamily: '"Orbitron", monospace',
                fontSize: '0.62rem',
                letterSpacing: 3,
                color: primaryMain,
                borderColor: alpha(primaryMain, 0.3),
                bgcolor: alpha(primaryMain, 0.05),
                mb: 3,
                px: 1,
              }}
            />
            <Typography
              variant="h2"
              fontWeight={700}
              sx={{
                background: isDark 
                  ? `linear-gradient(135deg, #fff 0%, ${primaryMain} 60%)`
                  : `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${primaryMain} 80%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 2,
                fontFamily: '"Orbitron", sans-serif',
                fontSize: { xs: '2.2rem', md: '3.5rem' },
                lineHeight: 1.2,
              }}
            >
              The Infrastructure of<br />Modern Freelancing
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ 
                maxWidth: 620, 
                mx: 'auto', 
                fontWeight: 500, 
                lineHeight: 1.7, 
                mb: 6,
                fontFamily: '"Rajdhani", sans-serif',
                fontSize: '1.2rem'
              }}
            >
              Lancer Lab is a decentralized marketplace protocol built on Solana. 
              We replace platform middlemen with immutable code, ensuring trust is
              guaranteed by cryptography rather than company promises.
            </Typography>

            {/* Protocol Stats */}
            <Grid container spacing={2} justifyContent="center">
              {protocolStats.map((stat) => (
                <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
                  <Box
                    sx={{
                      p: 2.5,
                      border: 1,
                      borderColor: alpha(primaryMain, 0.12),
                      borderRadius: 2,
                      bgcolor: isDark ? alpha(primaryMain, 0.02) : '#fff',
                      boxShadow: isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.03)',
                    }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{
                        fontFamily: '"Orbitron", sans-serif',
                        color: primaryMain,
                        mb: 0.5,
                        filter: isDark ? `drop-shadow(0 0 8px ${alpha(primaryMain, 0.4)})` : 'none',
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ letterSpacing: 1, fontWeight: 500 }}
                    >
                      {stat.label.toUpperCase()}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ py: 10 }}>

          {/* Mission */}
          <Grid container spacing={4} sx={{ mb: 12 }} alignItems="stretch">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 4,
                  border: 1,
                  borderColor: alpha(errorMain, 0.15),
                  borderRadius: 3,
                  bgcolor: alpha(errorMain, 0.02),
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: errorMain, letterSpacing: 3, fontSize: '0.62rem', display: 'block', mb: 2, fontWeight: 700 }}
                  >
                    THE PROBLEM
                  </Typography>
                  <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                    Traditional Extraction
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    paragraph 
                    sx={{ 
                      lineHeight: 1.8, 
                      fontSize: '1.05rem',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    Centralized platforms sit in the middle of every transaction — taking 10–20% fees,
                    holding your hard-earned funds for weeks, and arbitrarily suspending accounts.
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    sx={{ 
                      lineHeight: 1.8, 
                      fontSize: '1.05rem',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    They monetize your reputation data while you do all the work. Your ratings belong to
                    the platform, not to you. If you leave, you lose your entire history.
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    position: 'absolute', bottom: -20, right: -20, 
                    opacity: 0.05, fontSize: '120px', color: errorMain,
                    transform: 'rotate(-15deg)'
                  }}
                >
                  <LockOutlined fontSize="inherit" />
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 4,
                  border: 1,
                  borderColor: alpha(primaryMain, 0.15),
                  borderRadius: 3,
                  bgcolor: alpha(primaryMain, 0.02),
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: primaryMain, letterSpacing: 3, fontSize: '0.62rem', display: 'block', mb: 2, fontWeight: 700 }}
                  >
                    THE SOLUTION
                  </Typography>
                  <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                    Immutable Protocol
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    paragraph 
                    sx={{ 
                      lineHeight: 1.8, 
                      fontSize: '1.05rem',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    Lancer Lab removes the middleman entirely. Smart contracts handle escrow, dispute
                    resolution, and payments — all verifiable on-chain in real-time.
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="text.secondary" 
                    sx={{ 
                      lineHeight: 1.8, 
                      fontSize: '1.05rem',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: 500,
                    }}
                  >
                    Your reputation is an on-chain asset that belongs to your wallet. We take 0% of your earnings.
                    In this ecosystem, the code is the only authority.
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    position: 'absolute', bottom: -20, right: -20, 
                    opacity: 0.05, fontSize: '120px', color: primaryMain,
                    transform: 'rotate(-15deg)'
                  }}
                >
                  <Code fontSize="inherit" />
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Features */}
          <Box sx={{ mb: 12 }}>
            <Box sx={{ mb: 6, textAlign: 'center' }}>
              <Typography
                variant="overline"
                sx={{ color: primaryMain, letterSpacing: 4, fontSize: '0.62rem', fontWeight: 700, mb: 1, display: 'block' }}
              >
                CORE PROTOCOL
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Protocol Features
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                Everything built on Solana smart contracts — verifiable, auditable, and unstoppable.
              </Typography>
            </Box>
            <MotionBox
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, amount: 0.1 }}
            >
              <Grid container spacing={3}>
                {features.map((f) => (
                  <Grid key={f.title} size={{ xs: 12, sm: 6, md: 4 }}>
                    <MotionCard
                      variants={staggerChild}
                      sx={{
                        height: '100%',
                        border: 1,
                        borderColor: alpha(primaryMain, 0.08),
                        bgcolor: isDark ? alpha('#fff', 0.01) : '#fff',
                        borderRadius: 3,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          borderColor: alpha(f.accent, 0.4),
                          boxShadow: isDark 
                            ? `0 0 30px ${alpha(f.accent, 0.08)}`
                            : `0 12px 30px ${alpha(f.accent, 0.1)}`,
                          transform: 'translateY(-6px)',
                          '& .feature-icon': {
                            transform: 'scale(1.1) rotate(5deg)',
                            color: f.accent,
                          }
                        },
                      }}
                    >
                      <CardContent sx={{ p: 4 }}>
                        <Box
                          className="feature-icon"
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: alpha(f.accent, 0.08),
                            mb: 3,
                            transition: 'all 0.3s ease',
                            border: 1,
                            borderColor: alpha(f.accent, 0.15),
                          }}
                        >
                          <f.icon
                            sx={{
                              fontSize: 28,
                              color: f.accent,
                              filter: isDark ? `drop-shadow(0 0 8px ${alpha(f.accent, 0.4)})` : 'none',
                            }}
                          />
                        </Box>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {f.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
                          {f.desc}
                        </Typography>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1.5, py: 0.5,
                            borderRadius: 1,
                            bgcolor: alpha(f.accent, 0.05),
                            border: 1,
                            borderColor: alpha(f.accent, 0.1),
                            color: f.accent,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            letterSpacing: 1,
                          }}
                        >
                          {f.detail}
                        </Box>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Box>

          <Divider sx={{ mb: 10, borderColor: alpha(primaryMain, 0.08) }} />

          {/* Tech Stack */}
          <Box sx={{ mb: 12 }}>
            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Battle-Tested Architecture
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lancer Lab is built with modern, open-source infrastructure for maximum reliability.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {stack.map((s) => (
                <Box
                  key={s.label}
                  sx={{
                    px: 3,
                    py: 1,
                    border: 1,
                    borderColor: alpha(s.color, 0.2),
                    borderRadius: 2,
                    bgcolor: alpha(s.color, 0.05),
                    color: s.color,
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    cursor: 'default',
                    '&:hover': {
                      bgcolor: alpha(s.color, 0.1),
                      borderColor: alpha(s.color, 0.4),
                      transform: 'scale(1.05)',
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
              p: 5,
              border: 1,
              borderColor: alpha(primaryMain, 0.12),
              borderRadius: 4,
              bgcolor: isDark ? 'rgba(0,0,0,0.4)' : '#f8fafc',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    bgcolor: primaryMain,
                    boxShadow: `0 0 12px ${primaryMain}`,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.4, transform: 'scale(0.8)' },
                    },
                  }}
                />
                <Typography
                  variant="overline"
                  sx={{ color: primaryMain, letterSpacing: 4, fontSize: '0.7rem', fontWeight: 700 }}
                >
                  MAINNET DEPLOYMENT STATUS: ACTIVE
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Live on Solana Mainnet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, maxWidth: 700 }}>
                Lancer Lab is fully deployed and operational. All smart contracts are open-source 
                and verified on the Solana blockchain. Connect your wallet to experience the future
                of work today.
              </Typography>
            </Box>
            {/* Background decoration */}
            <Box
              sx={{
                position: 'absolute',
                top: -50, right: -50,
                width: 200, height: 200,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha(primaryMain, 0.1)} 0%, transparent 70%)`,
              }}
            />
          </Box>

        </Container>
      </Box>
    </Layout>
  )
}
