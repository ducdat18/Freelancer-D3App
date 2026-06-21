import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Stack,
  useTheme,
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import {
  Search as SearchIcon,
  Star,
  Work,
  Chat,
  Person,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';
import { useSolanaProgram } from '../../hooks/useSolanaProgram';
import { deriveReputationPDA } from '../../utils/pda';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';

interface FreelancerProfile {
  address: string;
  reputation: {
    totalReviews: number;
    averageRating: number;
    completedJobs: number;
  } | null;
}

export default function BrowseFreelancersTab() {
  const { connected, publicKey } = useWallet();
  const { program } = useSolanaProgram();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [freelancers, setFreelancers] = useState<FreelancerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  useEffect(() => {
    loadFreelancers();
  }, [program]);

  const loadFreelancers = async () => {
    if (!program) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all reputation accounts
      // @ts-ignore
      const reputationAccounts = await program.account.reputation.all();

      const profiles: FreelancerProfile[] = reputationAccounts.map((account: any) => ({
        address: account.account.user.toBase58(),
        reputation: {
          totalReviews: account.account.totalReviews || 0,
          averageRating: account.account.averageRating || 0,
          completedJobs: account.account.completedJobs || 0,
        },
      }));

      // Sort by rating and completed jobs
      profiles.sort((a, b) => {
        const scoreA = (a.reputation?.averageRating || 0) * 10 + (a.reputation?.completedJobs || 0);
        const scoreB = (b.reputation?.averageRating || 0) * 10 + (b.reputation?.completedJobs || 0);
        return scoreB - scoreA;
      });

      setFreelancers(profiles);
    } catch (err) {
      console.error('Error loading freelancers:', err);
      setError('Failed to load freelancers');
    } finally {
      setLoading(false);
    }
  };

  const filteredFreelancers = freelancers.filter((freelancer) =>
    freelancer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'primary';
    if (rating >= 2.5) return 'warning';
    return 'error';
  };

  if (!connected) {
    return (
      <Alert severity="info" sx={{ fontWeight: 500 }}>
        Please connect your wallet to browse freelancers
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
        Browse and connect with top freelancers. Review their on-chain reputation and history.
      </Typography>

      {/* Search Bar */}
      <TextField
        fullWidth
        placeholder="Search by wallet address..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 4 }}
      />

      {loading ? (
        <LoadingSpinner
          message="Scanning freelancer profiles..."
          logs={[
            { text: 'gPA: ReputationData[initialized = true]...', type: 'info' },
            { text: 'Joining SBT reputation scores per wallet...', type: 'info' },
            { text: 'Sorted: rating DESC, jobs_completed DESC', type: 'ok' },
          ]}
          sx={{ mt: 2 }}
        />
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : filteredFreelancers.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Person sx={{ fontSize: 48, color: 'text.disabled', opacity: 0.5, mb: 1 }} />
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {searchTerm ? 'No freelancers found matching your search.' : 'No freelancers available yet. Check back later!'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filteredFreelancers.map((freelancer) => (
            <Grid key={freelancer.address} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  height: '100%',
                  border: 1,
                  borderColor: 'divider',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: isDark ? `0 0 20px ${primaryMain}15` : '0 4px 12px rgba(0,0,0,0.05)',
                    borderColor: primaryMain,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
                    <Avatar
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: isDark ? 'rgba(0,255,195,0.1)' : 'rgba(5,150,105,0.08)',
                        color: primaryMain,
                        mr: 2,
                        border: 1,
                        borderColor: isDark ? 'rgba(0,255,195,0.2)' : 'rgba(5,150,105,0.2)',
                        fontWeight: 700,
                        fontFamily: '"Orbitron", sans-serif',
                      }}
                    >
                      {freelancer.address.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                        {formatAddress(freelancer.address)}
                      </Typography>
                      {freelancer.reputation && freelancer.reputation.totalReviews > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <Star sx={{ fontSize: 16, color: '#f59e0b' }} />
                          <Typography variant="body2" fontWeight={700}>
                            {freelancer.reputation.averageRating.toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            ({freelancer.reputation.totalReviews} {freelancer.reputation.totalReviews === 1 ? 'review' : 'reviews'})
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                    {freelancer.reputation && (
                      <>
                        <Chip
                          icon={<Work sx={{ fontSize: '0.9rem !important' }} />}
                          label={`${freelancer.reputation.completedJobs} completed`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                        {freelancer.reputation.totalReviews > 0 && (
                          <Chip
                            label={`${freelancer.reputation.averageRating.toFixed(1)}★ Rating`}
                            size="small"
                            color={getRatingColor(freelancer.reputation.averageRating) as any}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        )}
                      </>
                    )}
                    {(!freelancer.reputation || freelancer.reputation.totalReviews === 0) && (
                      <Chip label="NEW" size="small" color="info" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1.5}>
                    <Button
                      component={Link}
                      href={`/profile/${freelancer.address}`}
                      variant="contained"
                      size="small"
                      fullWidth
                      sx={{ fontWeight: 700 }}
                    >
                      Profile
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Chat />}
                      onClick={() => router.push(`/messages?recipient=${freelancer.address}`)}
                      sx={{ minWidth: '110px', fontWeight: 700 }}
                    >
                      Chat
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
