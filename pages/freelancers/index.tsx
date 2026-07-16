import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Grid, Card, CardContent,
  Avatar, Chip, Button, TextField, InputAdornment,
  Alert, Stack, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Tooltip, useTheme, alpha,
} from '@mui/material';
import {
  Search as SearchIcon, Star, Work, Chat, Person, Close, Send,
  AccountBalanceWallet, Gavel, VerifiedUser,
} from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { formatSol } from '../../src/types/solana';
import { useRouter } from 'next/router';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useJobs } from '../../src/hooks/useJobs';
import Link from 'next/link';
import ChatDialog from '../../src/components/chat/ChatDialog';
import { getExperienceLevel } from '../../src/utils/userRole';
import { motion } from 'framer-motion';
import { staggerContainer, staggerChild } from '../../src/utils/animations';
import VerifiedBadge from '../../src/components/VerifiedBadge';
import AISmartMatch from '../../src/components/ai/AISmartMatch';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

interface FreelancerProfile {
  address: string;
  reputation: {
    totalReviews: number;
    averageRating: number;
    completedJobs: number;
  } | null;
  isDemo?: boolean;
  isJuror?: boolean;          // demo override: active juror stake
  isKycVerifiedDemo?: boolean; // demo override: KYC verified
}

// ─── Demo profiles shown when chain has few results ───────────────────────────
const DEMO_FREELANCERS: FreelancerProfile[] = [
  { address: 'ALex9Tz4F8rKP2mVcDqNwY3bHuJ7oGsX1iE6nRdWfLpM', reputation: { averageRating: 4.95, totalReviews: 87,  completedJobs: 94  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: true  },
  { address: 'SrM3kWqBnJd5YvXtH8pLcEoFa2iZuR7gN6eQ4wC1yDsT', reputation: { averageRating: 5.0,  totalReviews: 112, completedJobs: 118 }, isDemo: true, isKycVerifiedDemo: true,  isJuror: true  },
  { address: 'DvK7mRpXoB1eLnWaG5tQcJ3iYuHs8FdNz4A2wE6rTvCg', reputation: { averageRating: 4.8,  totalReviews: 61,  completedJobs: 73  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: false },
  { address: 'EmW2cLzFqY9nSdKbP6oHvXeR3gJt5MiA7uB4wDrNkTsCj', reputation: { averageRating: 4.7,  totalReviews: 44,  completedJobs: 51  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: true  },
  { address: 'KhT5oNxJbV8mZqLdC2pWfRaG3sSyH1iE4nYeUwDrKcF6', reputation: { averageRating: 4.6,  totalReviews: 38,  completedJobs: 42  }, isDemo: true, isKycVerifiedDemo: false, isJuror: true  },
  { address: 'PyA4bGcMnR7kWdXtE1oZqJhF2sSvL9uN3iT6eYwBrKpD', reputation: { averageRating: 4.9,  totalReviews: 73,  completedJobs: 81  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: false },
  { address: 'LuC8wHpQoD3nKvBmF5tAeYrJ2iGxZ6sSdN7gR1cWbTEf', reputation: { averageRating: 4.5,  totalReviews: 29,  completedJobs: 35  }, isDemo: true, isKycVerifiedDemo: false, isJuror: false },
  { address: 'RoF6kNzSaE2mBdJcP9tLvXwG4iQyH7oR3uT1nWsYeCbA', reputation: { averageRating: 4.85, totalReviews: 56,  completedJobs: 63  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: false },
  { address: 'VnB3gTwKmP7eLdAcQ2oFrYxH1iNjZ5sSuR8tE6vWzJbC', reputation: { averageRating: 3.9,  totalReviews: 17,  completedJobs: 22  }, isDemo: true, isKycVerifiedDemo: false, isJuror: false },
  { address: 'WzD9cReLmN4kAoPbQ7tGxF3iSvH2uJ1yE6sTwBrKnXdY', reputation: { averageRating: 4.3,  totalReviews: 21,  completedJobs: 28  }, isDemo: true, isKycVerifiedDemo: false, isJuror: false },
  { address: 'MbE5hWxJnP8sTdCqG2oRkFvA3iYuL7eN1rT4wZgBcKoD', reputation: { averageRating: 4.75, totalReviews: 49,  completedJobs: 57  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: false },
  { address: 'JcG1nLzRoA6eBdKmP4tWxF9iSvQ3uH7yE2sTjBrNwXeY', reputation: { averageRating: 4.2,  totalReviews: 14,  completedJobs: 19  }, isDemo: true, isKycVerifiedDemo: false, isJuror: false },
  { address: 'TkH2oMzSnB7eDdLnP5tAxF1iRvQ4uG8yE3sWjCrKwYeZ', reputation: { averageRating: 5.0,  totalReviews: 33,  completedJobs: 37  }, isDemo: true, isKycVerifiedDemo: true,  isJuror: true  },
  { address: 'XpI3qNzTmC8eFeLnP6tByG2iSvR5uH9yE4sXjDrLwZfA', reputation: { averageRating: 4.65, totalReviews: 42,  completedJobs: 48  }, isDemo: true, isKycVerifiedDemo: false, isJuror: false },
  { address: 'NqJ4rOzUnD9eFfMoP7tCzH3iSvS6uI0yE5tYjErMxAgB', reputation: { averageRating: 4.55, totalReviews: 31,  completedJobs: 38  }, isDemo: true, isKycVerifiedDemo: false, isJuror: false },
];

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          sx={{
            fontSize: 12,
            color: rating >= i ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
          }}
        />
      ))}
      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 600 }}>
        {rating.toFixed(1)} ({reviews})
      </Typography>
    </Box>
  );
}

export default function FindTalent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useSolanaProgram();
  const router = useRouter();
  const { jobs, loading: loadingJobs } = useJobs({ autoFetch: true });
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const [searchTerm, setSearchTerm] = useState('');
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('rating');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterJobs, setFilterJobs] = useState<string>('all');

  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<string>('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [kycVerified, setKycVerified] = useState<Record<string, boolean>>({});
  const [jurorActive, setJurorActive] = useState<Record<string, boolean>>({});

  useEffect(() => { loadFreelancers(); }, [program]);

  const loadFreelancers = async () => {
    if (!program) return;
    try {
      setLoading(true);
      setError(null);
      const freelancerMap = new Map<string, FreelancerProfile>();

      try {
        // @ts-ignore
        const reputationAccounts = await program.account.reputation.all();
        reputationAccounts.forEach((account: any) => {
          const address = account.account.user.toBase58();
          freelancerMap.set(address, {
            address,
            reputation: {
              totalReviews: account.account.totalReviews || 0,
              averageRating: account.account.averageRating || 0,
              completedJobs: account.account.completedJobs || 0,
            },
          });
        });
      } catch { }

      try {
        // @ts-ignore
        const allBids = await program.account.bid.all();
        allBids.forEach((bid: any) => {
          const address = bid.account.freelancer.toBase58();
          if (!freelancerMap.has(address)) {
            freelancerMap.set(address, {
              address,
              reputation: { totalReviews: 0, averageRating: 0, completedJobs: 0 },
            });
          }
        });
      } catch { }

      try {
        // @ts-ignore
        const allJobs = await program.account.job.all();
        allJobs.forEach((job: any) => {
          const sf = job.account.selectedFreelancer;
          if (sf && !sf.equals(new PublicKey('11111111111111111111111111111111'))) {
            const address = sf.toBase58();
            if (!freelancerMap.has(address)) {
              freelancerMap.set(address, {
                address,
                reputation: { totalReviews: 0, averageRating: 0, completedJobs: 0 },
              });
            }
          }
        });
      } catch { }

      // Merge demo profiles that aren't already on-chain
      const chainAddresses = new Set(freelancerMap.keys());
      const demos = DEMO_FREELANCERS.filter(d => !chainAddresses.has(d.address));
      const freelancerList = [...Array.from(freelancerMap.values()), ...demos];
      setFreelancers(freelancerList);

      // Batch-fetch KYC statuses from chain
      try {
        // @ts-ignore
        const allKycRecords = await program.account.kycRecord.all();
        const verifiedMap: Record<string, boolean> = {};
        allKycRecords.forEach((r: any) => {
          const addr = r.account.authority.toBase58();
          const isVerified = r.account.status?.verified !== undefined;
          verifiedMap[addr] = isVerified;
        });
        setKycVerified(verifiedMap);
      } catch { /* chain may not have kyc program yet */ }

      // Batch-fetch active juror stakes from chain
      try {
        // @ts-ignore
        const allJurorStakes = await program.account.jurorStake.all();
        const jurorMap: Record<string, boolean> = {};
        allJurorStakes.forEach((r: any) => {
          const addr = r.account.juror.toBase58();
          jurorMap[addr] = r.account.active === true;
        });
        setJurorActive(jurorMap);
      } catch { /* juror stake program may not be deployed */ }
    } catch {
      setError('Failed to load freelancers');
    } finally {
      setLoading(false);
    }
  };

  const myOpenJobs = connected && publicKey
    ? jobs.filter((job) => {
        const isMyJob = job.account.client.toBase58() === publicKey.toBase58();
        const status = typeof job.account.status === 'object'
          ? Object.keys(job.account.status)[0]
          : job.account.status;
        const isOpen = status === 0 || status === 'open';
        return isMyJob && isOpen;
      })
    : [];

  const filteredFreelancers = freelancers
    .filter((freelancer) => {
      if (connected && publicKey && freelancer.address === publicKey.toBase58()) return false;
      if (!freelancer.address.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterRating !== 'all' && freelancer.reputation) {
        const r = freelancer.reputation.averageRating;
        if (filterRating === 'high' && r < 4.0) return false;
        if (filterRating === 'medium' && (r < 3.0 || r >= 4.0)) return false;
        if (filterRating === 'low' && r >= 3.0) return false;
      }
      if (filterJobs !== 'all' && freelancer.reputation) {
        const j = freelancer.reputation.completedJobs;
        if (filterJobs === 'experienced' && j < 5) return false;
        if (filterJobs === 'intermediate' && (j < 2 || j >= 5)) return false;
        if (filterJobs === 'beginner' && j >= 2) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.reputation?.averageRating || 0) - (a.reputation?.averageRating || 0);
      if (sortBy === 'jobs') return (b.reputation?.completedJobs || 0) - (a.reputation?.completedJobs || 0);
      if (sortBy === 'reviews') return (b.reputation?.totalReviews || 0) - (a.reputation?.totalReviews || 0);
      return 0;
    });

  const formatAddress = (address: string) => `${address.slice(0, 8)}...${address.slice(-4)}`;

  const handleOpenChat = (address: string) => { setChatRecipient(address); setChatDialogOpen(true); };
  const handleOpenInvite = (address: string) => { setSelectedFreelancer(address); setInviteDialogOpen(true); };
  const handleSendInvite = () => {
    if (!selectedJob || !selectedFreelancer) return;
    router.push(`/jobs/${selectedJob}?invite=${selectedFreelancer}`);
    setInviteDialogOpen(false);
  };

  return (
    <>
      {/* Page Header */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          background: isDark 
            ? 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)'
            : `linear-gradient(180deg, ${primaryMain}08 0%, transparent 100%)`,
          px: { xs: 2, md: 4 },
          py: { xs: 4, md: 5 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Chip
                label="// TALENT NETWORK"
                size="small"
                variant="outlined"
                sx={{
                  fontFamily: '"Orbitron", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: 2,
                  color: primaryMain,
                  borderColor: isDark ? 'rgba(0,255,195,0.25)' : alpha(primaryMain, 0.4),
                  bgcolor: isDark ? 'rgba(0,255,195,0.04)' : alpha(primaryMain, 0.08),
                  mb: 1.5,
                  fontWeight: 700,
                }}
              />
              <Typography
                variant="h3"
                fontWeight={700}
                sx={{
                  background: isDark 
                    ? `linear-gradient(135deg, #fff 20%, ${primaryMain} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.text.primary} 20%, ${primaryMain} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                }}
              >
                Find Talent
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse freelancers with verifiable on-chain reputation
              </Typography>
            </Box>
            {!loading && (
              <Box
                sx={{
                  px: 2.5, py: 1,
                  border: 1,
                  borderColor: isDark ? 'rgba(0,255,195,0.2)' : alpha(primaryMain, 0.3),
                  borderRadius: 1.5,
                  bgcolor: isDark ? 'rgba(0,255,195,0.05)' : alpha(primaryMain, 0.08),
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{ fontFamily: '"Orbitron", sans-serif', color: primaryMain, lineHeight: 1 }}
                >
                  {filteredFreelancers.length}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  freelancers
                </Typography>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Filter Bar */}
        <Box
          sx={{
            p: 2,
            mb: 4,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.03)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              placeholder="Search by wallet address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
              <InputLabel>Rating</InputLabel>
              <Select value={filterRating} label="Rating" onChange={(e) => setFilterRating(e.target.value)}>
                <MenuItem value="all">All Ratings</MenuItem>
                <MenuItem value="high">High (4.0+)</MenuItem>
                <MenuItem value="medium">Medium (3.0–4.0)</MenuItem>
                <MenuItem value="low">{'Low (<3.0)'}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
              <InputLabel>Experience</InputLabel>
              <Select value={filterJobs} label="Experience" onChange={(e) => setFilterJobs(e.target.value)}>
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="experienced">Experienced (5+)</MenuItem>
                <MenuItem value="intermediate">Intermediate (2–5)</MenuItem>
                <MenuItem value="beginner">{'Beginner (<2)'}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                <MenuItem value="rating">Highest Rating</MenuItem>
                <MenuItem value="jobs">Most Jobs</MenuItem>
                <MenuItem value="reviews">Most Reviews</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {!connected && (
          <Box
            sx={{
              mb: 3, p: 2,
              border: 1,
              borderColor: isDark ? 'rgba(0,255,195,0.15)' : alpha(primaryMain, 0.3),
              borderRadius: 1.5,
              bgcolor: isDark ? 'rgba(0,255,195,0.04)' : alpha(primaryMain, 0.08),
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Browse freelancers freely — connect your wallet to message or invite them to your jobs.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AccountBalanceWallet sx={{ fontSize: 15 }} />}
              onClick={() => setVisible(true)}
              sx={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 700 }}
            >
              Connect Wallet
            </Button>
          </Box>
        )}

        {!loading && !error && connected && myOpenJobs.length > 0 && (
          <AISmartMatch
            openJobs={myOpenJobs.map((job) => ({
              id: job.publicKey.toString(),
              title: job.account.title,
              description: job.account.description,
              budgetSol: job.account.budget.toNumber() / 1e9,
            }))}
            candidates={filteredFreelancers
              .filter((f) => !f.isDemo && f.reputation)
              .map((f) => ({
                address: f.address,
                completedJobs: f.reputation!.completedJobs,
                averageRating: f.reputation!.averageRating,
              }))}
            onInvite={(jobId, freelancerAddress) =>
              router.push(`/jobs/${jobId}?invite=${freelancerAddress}`)
            }
          />
        )}

        {loading ? (
          <LoadingSpinner
            message="Scanning freelancer profiles..."
            logs={[
              { text: 'gPA: ReputationData[initialized = true]...', type: 'info' },
              { text: 'gPA: BidData[all] — resolving unique freelancers...', type: 'info' },
              { text: 'gPA: JobData[selectedFreelancer != default]...', type: 'info' },
              { text: 'Merging sources → dedup by wallet pubkey...', type: 'ok' },
              { text: 'Sorted: rating DESC, jobs_completed DESC', type: 'ok' },
            ]}
          />
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        ) : filteredFreelancers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2 }}>
            <Person sx={{ fontSize: 56, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom fontWeight={600}>
              No freelancers found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm || filterRating !== 'all' || filterJobs !== 'all'
                ? 'Try adjusting your filters.'
                : 'No freelancers available yet.'}
            </Typography>
          </Box>
        ) : (
          <MotionBox
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <Grid container spacing={3}>
              {filteredFreelancers.map((freelancer) => {
                const rep = freelancer.reputation;
                const expLevel = rep ? getExperienceLevel(rep.completedJobs) : null;
                const isTopRated = rep && rep.averageRating >= 4.5 && rep.totalReviews > 0;
                const initials = freelancer.address.slice(0, 2).toUpperCase();
                const isKycVerified = kycVerified[freelancer.address] === true || freelancer.isKycVerifiedDemo === true;
                const isJuror = jurorActive[freelancer.address] === true || freelancer.isJuror === true;

                return (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={freelancer.address}>
                    <MotionCard
                      variants={staggerChild}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: 1,
                        borderColor: 'divider',
                        transition: 'all 0.22s ease',
                        backgroundImage: 'none',
                        '&:hover': {
                          borderColor: primaryMain,
                          boxShadow: isDark ? `0 0 28px ${alpha(primaryMain, 0.1)}` : '0 4px 20px rgba(0,0,0,0.05)',
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                        {/* Header: avatar + name + rating */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                          <Avatar
                            sx={{
                              width: 52,
                              height: 52,
                              background: `linear-gradient(135deg, ${primaryMain} 0%, ${secondaryMain} 100%)`,
                              color: theme.palette.primary.contrastText,
                              fontFamily: '"Orbitron", monospace',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              flexShrink: 0,
                              border: 1,
                              borderColor: 'background.paper',
                              boxShadow: isDark ? `0 0 16px ${alpha(primaryMain, 0.25)}` : '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, flexWrap: 'wrap' }}>
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}
                                noWrap
                              >
                                {formatAddress(freelancer.address)}
                              </Typography>
                              {isKycVerified && <VerifiedBadge size="sm" />}
                              {isJuror && (
                                <Tooltip title="Active Arbitrator — staked & eligible to resolve disputes" placement="top">
                                  <Box
                                    sx={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      width: 18, height: 18, borderRadius: '50%',
                                      bgcolor: alpha('#7c3aed', 0.15),
                                      border: 1, borderColor: alpha('#7c3aed', 0.4),
                                      color: '#7c3aed',
                                      cursor: 'default',
                                    }}
                                  >
                                    <Gavel sx={{ fontSize: 10 }} />
                                  </Box>
                                </Tooltip>
                              )}
                            </Box>
                            {rep && rep.totalReviews > 0 ? (
                              <StarRating rating={rep.averageRating} reviews={rep.totalReviews} />
                            ) : (
                              <Chip
                                label="NEW"
                                size="small"
                                sx={{
                                  bgcolor: isDark ? 'rgba(33,150,243,0.1)' : 'rgba(33,150,243,0.05)',
                                  color: theme.palette.info.main,
                                  border: 1,
                                  borderColor: alpha(theme.palette.info.main, 0.3),
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  height: 20
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Stats mini panel */}
                        {rep && (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 1,
                              mb: 2.5,
                              p: 1.5,
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            }}
                          >
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography
                                variant="h6"
                                fontWeight={800}
                                sx={{ fontFamily: '"Orbitron", sans-serif', color: primaryMain, lineHeight: 1 }}
                              >
                                {rep.completedJobs}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                jobs done
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography
                                variant="h6"
                                fontWeight={800}
                                sx={{ fontFamily: '"Orbitron", sans-serif', color: primaryMain, lineHeight: 1 }}
                              >
                                {rep.totalReviews > 0 ? rep.averageRating.toFixed(1) : '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                avg rating
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        {/* Badges */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
                          {isKycVerified && (
                            <Chip
                              icon={<VerifiedUser sx={{ fontSize: '12px !important' }} />}
                              label="ID Verified"
                              size="small"
                              sx={{
                                bgcolor: isDark ? alpha('#00ffc3', 0.08) : alpha('#00b894', 0.06),
                                color: isDark ? '#00ffc3' : '#00875a',
                                border: 1,
                                borderColor: isDark ? alpha('#00ffc3', 0.3) : alpha('#00b894', 0.3),
                                fontWeight: 700,
                                fontSize: '0.63rem',
                                height: 22,
                                '& .MuiChip-icon': { color: 'inherit' },
                              }}
                            />
                          )}
                          {isJuror && (
                            <Chip
                              icon={<Gavel sx={{ fontSize: '12px !important' }} />}
                              label="Arbitrator"
                              size="small"
                              sx={{
                                bgcolor: isDark ? alpha('#7c3aed', 0.1) : alpha('#7c3aed', 0.06),
                                color: '#7c3aed',
                                border: 1,
                                borderColor: alpha('#7c3aed', 0.3),
                                fontWeight: 700,
                                fontSize: '0.63rem',
                                height: 22,
                                '& .MuiChip-icon': { color: 'inherit' },
                              }}
                            />
                          )}
                          {isTopRated && (
                            <Chip
                              label="Top Rated"
                              size="small"
                              sx={{
                                bgcolor: isDark ? 'rgba(76,175,80,0.1)' : 'rgba(76,175,80,0.05)',
                                color: theme.palette.success.main,
                                border: 1,
                                borderColor: alpha(theme.palette.success.main, 0.3),
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                height: 22
                              }}
                            />
                          )}
                          {expLevel && (
                            <Chip
                              label={expLevel.label.toUpperCase()}
                              size="small"
                              color={expLevel.color}
                              sx={{ fontSize: '0.65rem', fontWeight: 700, height: 22 }}
                            />
                          )}
                        </Box>

                        {/* Actions */}
                        <Box sx={{ mt: 'auto' }}>
                          <Stack spacing={1.5}>
                            <Button
                              component={Link}
                              href={`/profile/${freelancer.address}`}
                              variant="contained"
                              size="small"
                              fullWidth
                              endIcon={<ArrowForwardIcon />}
                              sx={{ fontWeight: 700 }}
                            >
                              View Profile
                            </Button>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title={!connected ? 'Connect wallet to message' : ''} placement="top">
                                <span style={{ flex: 1 }}>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<Chat sx={{ fontSize: 14 }} />}
                                    onClick={() => connected ? handleOpenChat(freelancer.address) : setVisible(true)}
                                    fullWidth
                                    disabled={!connected}
                                    sx={{ fontWeight: 700 }}
                                  >
                                    Message
                                  </Button>
                                </span>
                              </Tooltip>
                              {connected && myOpenJobs.length > 0 && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="success"
                                  startIcon={<Send sx={{ fontSize: 14 }} />}
                                  onClick={() => handleOpenInvite(freelancer.address)}
                                  fullWidth
                                  sx={{ fontWeight: 700 }}
                                >
                                  Invite
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Box>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                );
              })}
            </Grid>
          </MotionBox>
        )}

        {/* Chat Dialog */}
        {chatRecipient && (
          <ChatDialog
            open={chatDialogOpen}
            onClose={() => setChatDialogOpen(false)}
            recipientAddress={chatRecipient}
          />
        )}

        {/* Invite to Job Dialog */}
        <Dialog 
          open={inviteDialogOpen} 
          onClose={() => setInviteDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { backgroundImage: 'none' } }}
        >
          <DialogTitle sx={{ py: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>Invite to Job</Typography>
              <IconButton onClick={() => setInviteDialogOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers={!isDark}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
              Select an open job to invite <strong style={{ fontFamily: 'monospace' }}>{formatAddress(selectedFreelancer)}</strong> to bid on.
            </Typography>
            {loadingJobs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : myOpenJobs.length === 0 ? (
              <Alert severity="info">You don&apos;t have any open jobs. Create a job first.</Alert>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Select Job</InputLabel>
                <Select value={selectedJob} label="Select Job" onChange={(e) => setSelectedJob(e.target.value)}>
                  {myOpenJobs.map((job) => (
                    <MenuItem key={job.publicKey.toString()} value={job.publicKey.toString()}>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{job.account.title}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {formatSol(job.account.budget.toNumber() / 1e9)} SOL
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setInviteDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSendInvite}
              disabled={!selectedJob}
              startIcon={<Send />}
              sx={{ px: 4, fontWeight: 700 }}
            >
              Send Invite
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
