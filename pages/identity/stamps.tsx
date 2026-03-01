import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Alert,
  Grid,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import BadgeIcon from '@mui/icons-material/Badge';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import StarIcon from '@mui/icons-material/Star';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useSybilResistance } from '../../src/hooks/useSybilResistance';
import { StampType, StampTypeLabels } from '../../src/types';

interface StampCardInfo {
  type: StampType;
  label: string;
  icon: React.ReactNode;
  weight: number;
  description: string;
}

const stampCards: StampCardInfo[] = [
  {
    type: StampType.PhoneVerified,
    label: StampTypeLabels[StampType.PhoneVerified],
    icon: <PhoneIcon sx={{ fontSize: 36 }} />,
    weight: 10,
    description: 'Verify your phone number via SMS',
  },
  {
    type: StampType.EmailVerified,
    label: StampTypeLabels[StampType.EmailVerified],
    icon: <EmailIcon sx={{ fontSize: 36 }} />,
    weight: 5,
    description: 'Verify your email address',
  },
  {
    type: StampType.GitHubConnected,
    label: StampTypeLabels[StampType.GitHubConnected],
    icon: <GitHubIcon sx={{ fontSize: 36 }} />,
    weight: 15,
    description: 'Connect your GitHub account',
  },
  {
    type: StampType.LinkedInConnected,
    label: StampTypeLabels[StampType.LinkedInConnected],
    icon: <LinkedInIcon sx={{ fontSize: 36 }} />,
    weight: 15,
    description: 'Connect your LinkedIn profile',
  },
  {
    type: StampType.TwitterConnected,
    label: StampTypeLabels[StampType.TwitterConnected],
    icon: <TwitterIcon sx={{ fontSize: 36 }} />,
    weight: 10,
    description: 'Connect your Twitter / X account',
  },
  {
    type: StampType.GovernmentId,
    label: StampTypeLabels[StampType.GovernmentId],
    icon: <BadgeIcon sx={{ fontSize: 36 }} />,
    weight: 25,
    description: 'Upload government-issued ID for KYC',
  },
  {
    type: StampType.BiometricVerified,
    label: StampTypeLabels[StampType.BiometricVerified],
    icon: <FingerprintIcon sx={{ fontSize: 36 }} />,
    weight: 20,
    description: 'Complete biometric liveness check',
  },
  {
    type: StampType.ExistingReputation,
    label: StampTypeLabels[StampType.ExistingReputation],
    icon: <StarIcon sx={{ fontSize: 36 }} />,
    weight: 10,
    description: 'Import reputation from on-chain history',
  },
  {
    type: StampType.StakingActive,
    label: StampTypeLabels[StampType.StakingActive],
    icon: <AccountBalanceIcon sx={{ fontSize: 36 }} />,
    weight: 10,
    description: 'Active governance token staker',
  },
  {
    type: StampType.ReferralVerified,
    label: StampTypeLabels[StampType.ReferralVerified],
    icon: <PeopleIcon sx={{ fontSize: 36 }} />,
    weight: 5,
    description: 'Referred by a verified platform user',
  },
];

const SCORE_THRESHOLD = 50;

export default function StampsPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const {
    sybilConfig,
    identityStamps,
    loading,
    error,
    fetchSybilConfig,
    fetchIdentityStamps,
    addIdentityStamp,
    recalculateHumanityScore,
  } = useSybilResistance();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verifyingStamp, setVerifyingStamp] = useState<number | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      fetchSybilConfig();
      fetchIdentityStamps();
    }
  }, [connected, publicKey, fetchSybilConfig, fetchIdentityStamps]);

  const humanityScore = identityStamps?.humanityScore ?? 0;
  const threshold = sybilConfig?.minScoreToBid ?? SCORE_THRESHOLD;
  const scorePercentage = Math.min((humanityScore / 100) * 100, 100);
  const thresholdPercentage = Math.min((threshold / 100) * 100, 100);
  const pointsNeeded = Math.max(threshold - humanityScore, 0);

  const isStampVerified = (stampType: StampType): boolean => {
    if (!identityStamps) return false;
    return identityStamps.stampTypes.includes(stampType);
  };

  const getStampWeight = (stampType: StampType): number => {
    if (!identityStamps) return 0;
    const idx = identityStamps.stampTypes.indexOf(stampType);
    if (idx === -1) return 0;
    return identityStamps.stampWeights[idx] || 0;
  };

  const handleVerifyStamp = async (stamp: StampCardInfo) => {
    try {
      setVerifyingStamp(stamp.type);
      const providerHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
      await addIdentityStamp(stamp.type, providerHash, stamp.weight);
      setSuccessMessage(`${stamp.label} stamp verified successfully.`);
      await fetchIdentityStamps();
    } catch (err: any) {
      // error handled by hook
    } finally {
      setVerifyingStamp(null);
    }
  };

  const handleRecalculate = async () => {
    try {
      await recalculateHumanityScore();
      setSuccessMessage('Humanity score recalculated.');
      await fetchIdentityStamps();
    } catch (err: any) {
      // error handled by hook
    }
  };

  if (!connected) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your wallet to verify your identity and earn stamps."
            actionLabel="Connect Wallet"
            onAction={() => setVisible(true)}
          />
        </Container>
      </Layout>
    );
  }

  if (loading && !identityStamps) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner message="Loading identity stamps..." />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header with Score */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <ShieldIcon sx={{ fontSize: 40, color: '#00ffc3' }} />
              <Typography variant="h4" fontWeight={700}>
                Identity Verification
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Earn stamps to prove your humanity and unlock platform features.
              Each stamp contributes points toward your humanity score.
            </Typography>

            {/* Threshold indicator */}
            {pointsNeeded > 0 ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You need <strong>{pointsNeeded} more points</strong> to participate in bidding.
                Verify additional stamps below to increase your score.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                Your humanity score meets the threshold. You have full platform access.
              </Alert>
            )}
          </Box>

          {/* Circular Score Display */}
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 200,
              border: '1px solid rgba(0, 255, 195, 0.15)',
              background: 'linear-gradient(135deg, rgba(0,255,195,0.03) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
              {/* Background track */}
              <CircularProgress
                variant="determinate"
                value={100}
                size={120}
                thickness={4}
                sx={{ color: 'rgba(255,255,255,0.08)' }}
              />
              {/* Score progress */}
              <CircularProgress
                variant="determinate"
                value={scorePercentage}
                size={120}
                thickness={4}
                sx={{
                  position: 'absolute',
                  left: 0,
                  color: humanityScore >= threshold ? '#00ffc3' : '#ff9800',
                  '& .MuiCircularProgress-circle': {
                    strokeLinecap: 'round',
                  },
                }}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{ color: humanityScore >= threshold ? '#00ffc3' : '#ff9800' }}
                >
                  {humanityScore}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  / 100
                </Typography>
              </Box>
            </Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Humanity Score
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Threshold: {threshold} pts
            </Typography>
            <Button
              size="small"
              onClick={handleRecalculate}
              disabled={loading}
              sx={{ mt: 1, fontSize: '0.75rem' }}
            >
              Recalculate
            </Button>
          </Paper>
        </Box>

        {/* Progress Bar */}
        <Paper sx={{ p: 2, mb: 4, border: '1px solid rgba(0, 255, 195, 0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              Score Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {humanityScore} / {threshold} points to threshold
            </Typography>
          </Box>
          <Box sx={{ position: 'relative' }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((humanityScore / threshold) * 100, 100)}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: humanityScore >= threshold
                    ? 'linear-gradient(90deg, #00ffc3, #00e6b0)'
                    : 'linear-gradient(90deg, #ff9800, #ffb74d)',
                },
              }}
            />
            {/* Threshold marker */}
            <Box
              sx={{
                position: 'absolute',
                top: -4,
                left: `${thresholdPercentage}%`,
                transform: 'translateX(-50%)',
                width: 2,
                height: 18,
                backgroundColor: '#ff4444',
                borderRadius: 1,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              0
            </Typography>
            <Typography
              variant="caption"
              sx={{
                position: 'relative',
                left: `${thresholdPercentage - 50}%`,
                color: '#ff4444',
                fontWeight: 600,
              }}
            >
              Threshold ({threshold})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              100
            </Typography>
          </Box>
        </Paper>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stamp Cards Grid */}
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
          Available Stamps
        </Typography>

        <Grid container spacing={3}>
          {stampCards.map((stamp) => {
            const verified = isStampVerified(stamp.type);
            const earnedWeight = getStampWeight(stamp.type);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={stamp.type}>
                <Paper
                  sx={{
                    p: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: verified
                      ? '1px solid rgba(0, 255, 195, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    background: verified
                      ? 'linear-gradient(135deg, rgba(0,255,195,0.05) 0%, rgba(0,0,0,0) 100%)'
                      : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: verified ? 'rgba(0, 255, 195, 0.5)' : 'rgba(0, 255, 195, 0.2)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box
                      sx={{
                        color: verified ? '#00ffc3' : 'text.secondary',
                        opacity: verified ? 1 : 0.6,
                      }}
                    >
                      {stamp.icon}
                    </Box>
                    {verified ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Verified"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        label={`+${stamp.weight} pts`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {stamp.label}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                    {stamp.description}
                  </Typography>

                  {verified ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUserIcon sx={{ color: '#00ffc3', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ color: '#00ffc3', fontWeight: 500 }}>
                        Earned {earnedWeight} points
                      </Typography>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleVerifyStamp(stamp)}
                      disabled={loading || verifyingStamp === stamp.type}
                      fullWidth
                      sx={{
                        borderColor: 'rgba(0, 255, 195, 0.3)',
                        color: '#00ffc3',
                        '&:hover': {
                          borderColor: '#00ffc3',
                          background: 'rgba(0, 255, 195, 0.08)',
                        },
                      }}
                    >
                      {verifyingStamp === stamp.type ? 'Verifying...' : 'Verify'}
                    </Button>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Layout>
  );
}
