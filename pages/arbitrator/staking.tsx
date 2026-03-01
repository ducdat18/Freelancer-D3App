import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Divider,
  Box,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  Gavel,
  People,
  HowToVote,
  Assignment,
} from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '../../src/components/Layout';
import JurorStakingPanel from '../../src/components/disputes/JurorStakingPanel';
import {
  useStakingDispute,
  type JurorRegistryData,
  type JurorSelectionData,
  type DisputeConfigData,
} from '../../src/hooks/useStakingDispute';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';

interface ActiveDisputeEntry {
  disputePda: string;
  selection: JurorSelectionData;
}

export default function StakingDashboard() {
  const { publicKey } = useWallet();
  const { program } = useSolanaProgram();
  const {
    fetchJurorRegistry,
    fetchDisputeConfig,
    fetchJurorSelection,
  } = useStakingDispute();

  const [registryData, setRegistryData] = useState<JurorRegistryData | null>(null);
  const [configData, setConfigData] = useState<DisputeConfigData | null>(null);
  const [activeDisputes, setActiveDisputes] = useState<ActiveDisputeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [registry, config] = await Promise.all([
        fetchJurorRegistry(),
        fetchDisputeConfig(),
      ]);

      setRegistryData(registry);
      setConfigData(config);

      // Fetch active disputes where the current user is a juror
      if (publicKey && program) {
        try {
          // @ts-ignore - Fetch all dispute accounts from the program
          const allDisputes = await program.account.dispute.all();

          const userDisputes: ActiveDisputeEntry[] = [];

          for (const dispute of allDisputes) {
            try {
              const selection = await fetchJurorSelection(dispute.publicKey);
              if (!selection) continue;

              // Check if user is selected and dispute is not resolved
              const isUserSelected = selection.selectedJurors.some(
                (j: any) => j.toString() === publicKey.toString()
              );

              if (isUserSelected && !selection.resolved) {
                userDisputes.push({
                  disputePda: dispute.publicKey.toString(),
                  selection,
                });
              }
            } catch {
              // Selection may not exist for this dispute
            }
          }

          setActiveDisputes(userDisputes);
        } catch (err: any) {
          console.error('Error fetching active disputes:', err);
          // Non-critical: don't block the entire page
        }
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [publicKey, program, fetchJurorRegistry, fetchDisputeConfig, fetchJurorSelection]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (!publicKey) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="info">
            Please connect your wallet to access the Juror Staking Dashboard.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Gavel sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              Juror Staking Dashboard
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Stake tokens to become a juror, participate in dispute resolution,
            and earn rewards for accurate voting.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Left Column - Staking Panel */}
          <Grid size={{ xs: 12, md: 7 }}>
            <JurorStakingPanel />
          </Grid>

          {/* Right Column - Registry Stats */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <People color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Juror Registry Stats
                  </Typography>
                </Box>

                {loading ? (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      py: 4,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Total Jurors */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(33, 150, 243, 0.08)',
                        border: '1px solid rgba(33, 150, 243, 0.2)',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Total Registered Jurors
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="primary.main">
                        {registryData?.totalJurors ?? 0}
                      </Typography>
                    </Box>

                    {/* Config Stats */}
                    {configData && (
                      <>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={600}
                            gutterBottom
                          >
                            Dispute Configuration
                          </Typography>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: 1.5,
                              mt: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Min Stake
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {(
                                  configData.minStakeAmount.toNumber() /
                                  1_000_000_000
                                ).toFixed(2)}{' '}
                                tokens
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Jurors per Dispute
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {configData.jurorCount}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Voting Period
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {(
                                  configData.votingPeriod.toNumber() / 3600
                                ).toFixed(1)}{' '}
                                hours
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Quorum
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {configData.quorumPercentage}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Reward Rate
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="success.main"
                              >
                                +{configData.rewardPercentage}%
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Slash Rate
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color="error.main"
                              >
                                -{configData.slashPercentage}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </>
                    )}

                    {!configData && !loading && (
                      <Alert severity="info">
                        Dispute configuration has not been initialized yet.
                      </Alert>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        {/* Active Disputes Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Assignment color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Your Active Disputes
            </Typography>
            <Chip
              label={`${activeDisputes.length} active`}
              size="small"
              color={activeDisputes.length > 0 ? 'warning' : 'default'}
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Disputes where you have been selected as a juror and voting is still
            in progress.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : activeDisputes.length === 0 ? (
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <HowToVote
              sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Active Disputes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are not currently assigned to any disputes. When you are
              selected as a juror, active disputes will appear here.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {activeDisputes.map((entry) => {
              const deadlineMs =
                entry.selection.votingDeadline.toNumber() * 1000;
              const deadlinePassed = Date.now() > deadlineMs;
              const deadlineDate = new Date(deadlineMs);

              return (
                <Grid
                  size={{ xs: 12, sm: 6, lg: 4 }}
                  key={entry.disputePda}
                >
                  <Card
                    sx={{
                      border: '1px solid',
                      borderColor: deadlinePassed
                        ? 'rgba(244, 67, 54, 0.3)'
                        : 'rgba(255, 152, 0, 0.3)',
                      borderRadius: 2,
                      height: '100%',
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {entry.disputePda.slice(0, 4)}...
                          {entry.disputePda.slice(-4)}
                        </Typography>
                        <Chip
                          label={
                            entry.selection.quorumMet
                              ? 'Quorum Met'
                              : 'Voting'
                          }
                          size="small"
                          color={
                            entry.selection.quorumMet ? 'success' : 'warning'
                          }
                        />
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Votes Cast
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.selection.votesCast} /{' '}
                            {entry.selection.selectedJurors.length}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Voting Deadline
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            color={
                              deadlinePassed ? 'error.main' : 'text.primary'
                            }
                          >
                            {deadlineDate.toLocaleString()}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Jurors Selected
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.selection.selectedJurors.length}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
    </Layout>
  );
}
