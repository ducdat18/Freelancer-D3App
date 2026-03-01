import { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Alert,
  Link as MuiLink,
  Avatar,
} from '@mui/material';
import { useWallet } from '@solana/wallet-adapter-react';
import { Schedule, OpenInNew } from '@mui/icons-material';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import Layout from '../../src/components/Layout';
import { formatDistanceToNow } from 'date-fns';
import { useBids } from '../../src/hooks/useBids';
import { SolanaIconSimple } from '../../src/components/SolanaIcon';
import Link from 'next/link';
import { useRouter } from 'next/router';

type TabValue = 'all' | 'pending' | 'accepted' | 'rejected';

export default function MyBids() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  // Fetch bids using the hook
  const { bids, loading, error, getBidStatusText, getBidStatusColor } = useBids({
    freelancerPubkey: publicKey || undefined,
    autoFetch: true,
  });

  // Filter bids based on active tab
  const filteredBids = useMemo(() => {
    if (activeTab === 'all') return bids;

    return bids.filter((bid) => {
      const statusText = getBidStatusText(bid.account.status).toLowerCase();
      return statusText === activeTab;
    });
  }, [bids, activeTab, getBidStatusText]);

  // Count bids by status
  const bidCounts = useMemo(() => {
    return {
      all: bids.length,
      pending: bids.filter(b => getBidStatusText(b.account.status).toLowerCase() === 'pending').length,
      accepted: bids.filter(b => getBidStatusText(b.account.status).toLowerCase() === 'accepted').length,
      rejected: bids.filter(b => getBidStatusText(b.account.status).toLowerCase() === 'rejected').length,
    };
  }, [bids, getBidStatusText]);

  if (!connected) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">
            Please connect your wallet to view your bids.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          My Bids
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Track all your submitted bids
        </Typography>

        <Paper sx={{ mb: 3, mt: 3 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label={`All (${bidCounts.all})`} value="all" />
            <Tab label={`Pending (${bidCounts.pending})`} value="pending" />
            <Tab label={`Accepted (${bidCounts.accepted})`} value="accepted" />
            <Tab label={`Rejected (${bidCounts.rejected})`} value="rejected" />
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <LoadingSpinner message="Loading your bids..." />
        ) : filteredBids.length === 0 ? (
          <EmptyState
            title={activeTab === 'all' ? 'No bids yet' : `No ${activeTab} bids`}
            message={activeTab === 'all'
              ? "Start browsing jobs and submit your first bid!"
              : `You don't have any ${activeTab} bids.`
            }
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {filteredBids.map((bid) => {
              const createdAt = new Date(bid.account.createdAt.toNumber() * 1000);
              const statusText = getBidStatusText(bid.account.status);
              const statusColor = getBidStatusColor(bid.account.status);

              return (
                <Card
                  key={bid.publicKey.toBase58()}
                  sx={{
                    '&:hover': {
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {bid.jobTitle || 'Unknown Job'}
                        </Typography>

                        {bid.clientAddress && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                              {bid.clientAddress.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              Client: {bid.clientAddress.slice(0, 4)}...{bid.clientAddress.slice(-4)}
                            </Typography>
                          </Box>
                        )}

                        <Typography variant="caption" color="text.secondary" display="block">
                          Submitted {formatDistanceToNow(createdAt, { addSuffix: true })}
                        </Typography>
                      </Box>

                      <Chip label={statusText} color={statusColor} size="medium" />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Your Bid
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SolanaIconSimple sx={{ fontSize: 16 }} />
                          <Typography variant="body1" fontWeight={600}>
                            {bid.budgetInSol.toFixed(4)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Timeline
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule sx={{ fontSize: 16 }} color="action" />
                          <Typography variant="body1" fontWeight={600}>
                            {bid.account.timelineDays} days
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Proposal
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-line',
                          maxHeight: 100,
                          overflow: 'auto',
                          p: 1.5,
                          bgcolor: 'background.default',
                          borderRadius: 1,
                        }}
                      >
                        {bid.account.proposal}
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      endIcon={<OpenInNew />}
                      onClick={() => router.push(`/jobs/${bid.account.job.toBase58()}`)}
                      fullWidth
                    >
                      View Job Details
                    </Button>

                    {statusText === 'Accepted' && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Congratulations! Your bid has been accepted. Start working on the project!
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Layout>
  );
}
