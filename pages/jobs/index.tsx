import { useState } from 'react';
import {
  Container, Typography, Box, Grid, TextField, InputAdornment,
  Alert, Card, CardContent, Button, Chip, FormControl, InputLabel,
  Select, MenuItem, Stack, Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import { useJobs } from '../../src/hooks/useJobs';
import { lamportsToSol, bnToNumber, formatSol } from '../../src/types/solana';
import { SolanaIconSimple } from '../../src/components/SolanaIcon';
import { JOB_STATUS } from '../../src/config/constants';
import { staggerContainer, staggerChild } from '../../src/utils/animations';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

export default function Jobs() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [budgetFilter, setBudgetFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [page, setPage] = useState(1);
  const { connected } = useWallet();

  const itemsPerPage = 9;
  const { jobs, loading, error } = useJobs({ autoFetch: true });

  const filteredJobs = jobs
    .filter((job) => {
      const status = typeof job.account.status === 'object'
        ? Object.keys(job.account.status)[0]
        : job.account.status;
      const statusValue = typeof status === 'string'
        ? (status === 'open' ? JOB_STATUS.OPEN :
           status === 'inProgress' ? JOB_STATUS.IN_PROGRESS :
           status === 'completed' ? JOB_STATUS.COMPLETED :
           status === 'disputed' ? JOB_STATUS.DISPUTED :
           JOB_STATUS.CANCELLED)
        : status;
      if (statusValue !== JOB_STATUS.OPEN) return false;

      const matchesSearch = job.account.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.account.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (budgetFilter !== 'all') {
        const budgetSol = lamportsToSol(bnToNumber(job.account.budget));
        if (budgetFilter === 'low' && budgetSol >= 1) return false;
        if (budgetFilter === 'medium' && (budgetSol < 1 || budgetSol >= 5)) return false;
        if (budgetFilter === 'high' && budgetSol < 5) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return bnToNumber(b.account.createdAt) - bnToNumber(a.account.createdAt);
      if (sortBy === 'oldest') return bnToNumber(a.account.createdAt) - bnToNumber(b.account.createdAt);
      if (sortBy === 'budget-high') return bnToNumber(b.account.budget) - bnToNumber(a.account.budget);
      if (sortBy === 'budget-low') return bnToNumber(a.account.budget) - bnToNumber(b.account.budget);
      if (sortBy === 'bids') return b.account.bidCount - a.account.bidCount;
      return 0;
    });

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleSearchChange = (value: string) => { setSearchTerm(value); setPage(1); };
  const handleBudgetChange = (value: string) => { setBudgetFilter(value); setPage(1); };
  const handleSortChange = (value: string) => { setSortBy(value); setPage(1); };

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
                label="// OPEN POSITIONS"
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
                Browse Jobs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Find your next opportunity on the Solana blockchain
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
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
                    {filteredJobs.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    open jobs
                  </Typography>
                </Box>
              )}
              {connected && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push('/jobs/create')}
                >
                  + Post Job
                </Button>
              )}
            </Box>
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
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              fullWidth
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
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
              <InputLabel>Budget</InputLabel>
              <Select value={budgetFilter} label="Budget" onChange={(e) => handleBudgetChange(e.target.value)}>
                <MenuItem value="all">All Budgets</MenuItem>
                <MenuItem value="low">{'< 1 SOL'}</MenuItem>
                <MenuItem value="medium">1 – 5 SOL</MenuItem>
                <MenuItem value="high">{'> 5 SOL'}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 160 } }}>
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} label="Sort By" onChange={(e) => handleSortChange(e.target.value)}>
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="budget-high">Budget: High → Low</MenuItem>
                <MenuItem value="budget-low">Budget: Low → High</MenuItem>
                <MenuItem value="bids">Most Bids</MenuItem>
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
              display: 'flex', alignItems: 'center', gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Browse jobs freely — connect your wallet to submit bids.
            </Typography>
          </Box>
        )}

        {loading ? (
          <LoadingSpinner
            message="Fetching open jobs..."
            logs={[
              { text: 'gPA: JobData[status = open]...', type: 'info' },
              { text: 'Filtering cancelled / in-progress...', type: 'info' },
              { text: 'Sorting: createdAt DESC', type: 'ok' },
            ]}
          />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : filteredJobs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <WorkOutlineIcon sx={{ fontSize: 56, color: 'rgba(0,255,195,0.2)', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No jobs found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Try adjusting your search or filters.' : 'No open jobs at the moment — check back soon.'}
            </Typography>
          </Box>
        ) : (
          <>
            <MotionBox
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              key={page}
            >
              <Stack spacing={2}>
                {paginatedJobs.map((job) => {
                  const budgetSol = lamportsToSol(bnToNumber(job.account.budget));
                  const postedDate = new Date(bnToNumber(job.account.createdAt) * 1000).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  });
                  return (
                    <MotionCard
                      key={job.publicKey.toString()}
                      variants={staggerChild}
                      sx={{
                        border: '1px solid rgba(0,255,195,0.08)',
                        transition: 'all 0.22s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'rgba(0,255,195,0.22)',
                          boxShadow: '0 0 28px rgba(0,255,195,0.06)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                      onClick={() => router.push(`/jobs/${job.publicKey}`)}
                    >
                      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                        <Box sx={{ display: 'flex', gap: { xs: 1.5, md: 2.5 }, alignItems: 'flex-start' }}>
                          {/* Left accent bar */}
                          <Box
                            sx={{
                              width: 3,
                              borderRadius: 4,
                              bgcolor: '#00ffc3',
                              alignSelf: 'stretch',
                              flexShrink: 0,
                              minHeight: 60,
                              boxShadow: '0 0 8px rgba(0,255,195,0.4)',
                            }}
                          />

                          {/* Main content */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              sx={{ mb: 0.75, lineHeight: 1.3, fontSize: { xs: '1rem', md: '1.1rem' } }}
                            >
                              {job.account.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.6,
                              }}
                            >
                              {job.account.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Chip
                                label="Open"
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(76,175,80,0.12)',
                                  color: '#4caf50',
                                  border: '1px solid rgba(76,175,80,0.25)',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                }}
                              />
                              <Chip
                                label={`${job.account.bidCount} ${job.account.bidCount === 1 ? 'bid' : 'bids'}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {postedDate}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Right: budget + CTA */}
                          <Box
                            sx={{
                              flexShrink: 0,
                              textAlign: 'right',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: 1,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <SolanaIconSimple sx={{ fontSize: 18, color: '#00ffc3' }} />
                              <Typography
                                variant="h6"
                                fontWeight={700}
                                sx={{
                                  fontFamily: '"Orbitron", sans-serif',
                                  color: '#00ffc3',
                                  fontSize: { xs: '1rem', md: '1.1rem' },
                                }}
                              >
                                {formatSol(budgetSol)}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
                              SOL budget
                            </Typography>
                            <Button
                              variant="contained"
                              size="small"
                              endIcon={<ArrowForwardIcon />}
                              onClick={(e) => { e.stopPropagation(); router.push(`/jobs/${job.publicKey}`); }}
                              sx={{ mt: 0.5 }}
                            >
                              View
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </MotionCard>
                  );
                })}
              </Stack>
            </MotionBox>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Layout>
  );
}
