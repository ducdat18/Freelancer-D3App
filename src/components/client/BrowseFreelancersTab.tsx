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
      <Alert severity="info">
        Please connect your wallet to browse freelancers
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Browse and connect with talented freelancers. View their profiles, ratings, and completed work.
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
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
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
        <Alert severity="info">
          {searchTerm ? 'No freelancers found matching your search.' : 'No freelancers available yet. Check back later!'}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {filteredFreelancers.map((freelancer) => (
            <Grid key={freelancer.address} size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'primary.main',
                        mr: 2,
                      }}
                    >
                      <Person />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {formatAddress(freelancer.address)}
                      </Typography>
                      {freelancer.reputation && freelancer.reputation.totalReviews > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Star sx={{ fontSize: 18, color: 'warning.main' }} />
                          <Typography variant="body2" fontWeight={600}>
                            {freelancer.reputation.averageRating.toFixed(1)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({freelancer.reputation.totalReviews} {freelancer.reputation.totalReviews === 1 ? 'review' : 'reviews'})
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {freelancer.reputation && (
                      <>
                        <Chip
                          icon={<Work />}
                          label={`${freelancer.reputation.completedJobs} jobs completed`}
                          size="small"
                          variant="outlined"
                        />
                        {freelancer.reputation.totalReviews > 0 && (
                          <Chip
                            label={`${freelancer.reputation.averageRating.toFixed(1)}★ Rating`}
                            size="small"
                            color={getRatingColor(freelancer.reputation.averageRating) as any}
                          />
                        )}
                      </>
                    )}
                    {(!freelancer.reputation || freelancer.reputation.totalReviews === 0) && (
                      <Chip label="New Freelancer" size="small" color="info" />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href={`/profile/${freelancer.address}`}
                      variant="contained"
                      size="small"
                      fullWidth
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Chat />}
                      onClick={() => router.push(`/messages?recipient=${freelancer.address}`)}
                      sx={{ minWidth: '120px' }}
                    >
                      Message
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
