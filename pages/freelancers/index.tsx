import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Grid, Card, CardContent,
  Avatar, Chip, Button, TextField, InputAdornment,
  Alert, Stack, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon, Star, Work, Chat, Person, Close, Send,
  AccountBalanceWallet,
} from '@mui/icons-material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { formatSol } from '../../src/types/solana';
import { useRouter } from 'next/router';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useJobs } from '../../src/hooks/useJobs';
import Link from 'next/link';
import ChatDialog from '../../src/components/chat/ChatDialog';
import { getExperienceLevel } from '../../src/utils/userRole';
import { motion } from 'framer-motion';
import { staggerContainer, staggerChild } from '../../src/utils/animations';
import VerifiedBadge from '../../src/components/VerifiedBadge';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

interface FreelancerProfile {
  address: string;
  reputation: {
    totalReviews: number;
    averageRating: number;
    completedJobs: number;
  } | null;
}

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          sx={{
            fontSize: 12,
            color: rating >= i ? '#ffc107' : 'rgba(255,255,255,0.15)',
          }}
        />
      ))}
      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
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

      const freelancerList = Array.from(freelancerMap.values());
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
    <Layout>
      {/* Page Header */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(0,255,195,0.08)',
          background: 'linear-gradient(180deg, rgba(0,255,195,0.03) 0%, transparent 100%)',
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
                  color: '#00ffc3',
                  borderColor: 'rgba(0,255,195,0.25)',
                  bgcolor: 'rgba(0,255,195,0.04)',
                  mb: 1.5,
                }}
              />
              <Typography
                variant="h3"
                fontWeight={700}
                sx={{
                  background: 'linear-gradient(135deg, #fff 20%, #00ffc3 100%)',
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
                  border: '1px solid rgba(0,255,195,0.2)',
                  borderRadius: 1.5,
                  bgcolor: 'rgba(0,255,195,0.05)',
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="h5"
                  fontWeight={700}
                  sx={{ fontFamily: '"Orbitron", sans-serif', color: '#00ffc3', lineHeight: 1 }}
                >
                  {filteredFreelancers.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
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
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.25)',
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
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
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
              border: '1px solid rgba(0,255,195,0.15)',
              borderRadius: 1.5,
              bgcolor: 'rgba(0,255,195,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Browse freelancers freely — connect your wallet to message or invite them to your jobs.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AccountBalanceWallet sx={{ fontSize: 15 }} />}
              onClick={() => setVisible(true)}
              sx={{ flexShrink: 0, fontSize: '0.75rem' }}
            >
              Connect Wallet
            </Button>
          </Box>
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
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Person sx={{ fontSize: 56, color: 'rgba(0,255,195,0.2)', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
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
                const isKycVerified = kycVerified[freelancer.address] === true;

                return (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={freelancer.address}>
                    <MotionCard
                      variants={staggerChild}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid rgba(0,255,195,0.08)',
                        transition: 'all 0.22s ease',
                        '&:hover': {
                          borderColor: 'rgba(0,255,195,0.22)',
                          boxShadow: '0 0 28px rgba(0,255,195,0.06)',
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
                              background: 'linear-gradient(135deg, #00ffc3 0%, #9945ff 100%)',
                              color: '#000',
                              fontFamily: '"Orbitron", monospace',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              flexShrink: 0,
                              boxShadow: '0 0 16px rgba(0,255,195,0.25)',
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}
                                noWrap
                              >
                                {formatAddress(freelancer.address)}
                              </Typography>
                              {isKycVerified && <VerifiedBadge size="sm" />}
                            </Box>
                            {rep && rep.totalReviews > 0 ? (
                              <StarRating rating={rep.averageRating} reviews={rep.totalReviews} />
                            ) : (
                              <Chip
                                label="New"
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(33,150,243,0.1)',
                                  color: '#2196f3',
                                  border: '1px solid rgba(33,150,243,0.25)',
                                  fontSize: '0.65rem',
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
                              mb: 2,
                              p: 1.5,
                              border: '1px solid rgba(0,255,195,0.08)',
                              borderRadius: 1.5,
                              bgcolor: 'rgba(0,255,195,0.02)',
                            }}
                          >
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{ fontFamily: '"Orbitron", sans-serif', color: '#00ffc3', lineHeight: 1 }}
                              >
                                {rep.completedJobs}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                jobs done
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{ fontFamily: '"Orbitron", sans-serif', color: '#00ffc3', lineHeight: 1 }}
                              >
                                {rep.totalReviews > 0 ? rep.averageRating.toFixed(1) : '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                avg rating
                              </Typography>
                            </Box>
                          </Box>
                        )}

                        {/* Badges */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2.5 }}>
                          {isTopRated && (
                            <Chip
                              label="Top Rated"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(76,175,80,0.1)',
                                color: '#4caf50',
                                border: '1px solid rgba(76,175,80,0.25)',
                                fontWeight: 600,
                                fontSize: '0.65rem',
                              }}
                            />
                          )}
                          {expLevel && (
                            <Chip
                              label={expLevel.label}
                              size="small"
                              color={expLevel.color}
                              sx={{ fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>

                        {/* Actions */}
                        <Box sx={{ mt: 'auto' }}>
                          <Stack spacing={1}>
                            <Button
                              component={Link}
                              href={`/profile/${freelancer.address}`}
                              variant="contained"
                              size="small"
                              fullWidth
                              endIcon={<ArrowForwardIcon />}
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
        <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={600}>Invite to Job</Typography>
              <IconButton onClick={() => setInviteDialogOpen(false)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select an open job to invite <strong style={{ fontFamily: 'monospace' }}>{formatAddress(selectedFreelancer)}</strong> to bid on.
            </Typography>
            {loadingJobs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : myOpenJobs.length === 0 ? (
              <Alert severity="info">You don't have any open jobs. Create a job first.</Alert>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Select Job</InputLabel>
                <Select value={selectedJob} label="Select Job" onChange={(e) => setSelectedJob(e.target.value)}>
                  {myOpenJobs.map((job) => (
                    <MenuItem key={job.publicKey.toString()} value={job.publicKey.toString()}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{job.account.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatSol(job.account.budget.toNumber() / 1e9)} SOL
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSendInvite}
              disabled={!selectedJob}
              startIcon={<Send />}
            >
              Send Invite
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}
