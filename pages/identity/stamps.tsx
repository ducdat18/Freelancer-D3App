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
  useTheme,
  alpha,
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
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

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
      <>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <EmptyState
            title="Wallet Not Connected"
            description="Connect your wallet to verify your identity and earn stamps."
            actionLabel="Connect Wallet"
            onAction={() => setVisible(true)}
          />
        </Container>
      </>
    );
  }

  if (loading && !identityStamps) {
    return (
      <>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner message="Loading identity stamps..." />
        </Container>
      </>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header with Score */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mb: 5 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <ShieldIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>
                Identity Verification
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
              Earn stamps to prove your humanity and unlock platform features.
              Each stamp contributes points toward your humanity score.
            </Typography>

            {/* Threshold indicator */}
            {pointsNeeded > 0 ? (
              <Alert severity="warning" sx={{ mt: 2, fontWeight: 500, border: 1, borderColor: 'warning.light' }}>
                You need <strong>{pointsNeeded} more points</strong> to participate in bidding.
                Verify additional stamps below to increase your score.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2, fontWeight: 600, border: 1, borderColor: 'success.light' }}>
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
              minWidth: 220,
              border: 1,
              borderColor: alpha(primaryMain, 0.2),
              background: isDark 
                ? `linear-gradient(135deg, ${alpha(primaryMain, 0.05)} 0%, transparent 100%)`
                : `linear-gradient(135deg, ${alpha(primaryMain, 0.02)} 0%, transparent 100%)`,
              borderRadius: 3,
              backgroundImage: 'none',
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
              {/* Background track */}
              <CircularProgress
                variant="determinate"
                value={100}
                size={120}
                thickness={4}
                sx={{ color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
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
                  color: humanityScore >= threshold ? primaryMain : theme.palette.warning.main,
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
                  fontWeight={800}
                  sx={{ color: humanityScore >= threshold ? primaryMain : theme.palette.warning.main, fontFamily: '"Orbitron", sans-serif' }}
                >
                  {humanityScore}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  / 100
                </Typography>
              </Box>
            </Box>
            <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Humanity Score
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Threshold: {threshold} pts
            </Typography>
            <Button
              size="small"
              onClick={handleRecalculate}
              disabled={loading}
              sx={{ mt: 1.5, fontSize: '0.7rem', fontWeight: 700 }}
            >
              Recalculate
            </Button>
          </Paper>
        </Box>

        {/* Progress Bar */}
        <Paper sx={{ p: 3, mb: 5, border: 1, borderColor: 'divider', borderRadius: 3, backgroundImage: 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Score Progress
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {humanityScore} / {threshold} points to threshold
            </Typography>
          </Box>
          <Box sx={{ position: 'relative', mt: 2, mb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((humanityScore / threshold) * 100, 100)}
              sx={{
                height: 12,
                borderRadius: 6,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                border: 1,
                borderColor: 'divider',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  background: humanityScore >= threshold
                    ? `linear-gradient(90deg, ${theme.palette.success.main}, ${primaryMain})`
                    : `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`,
                },
              }}
            />
            {/* Threshold marker */}
            <Box
              sx={{
                position: 'absolute',
                top: -6,
                left: `${thresholdPercentage}%`,
                transform: 'translateX(-50%)',
                width: 3,
                height: 24,
                backgroundColor: theme.palette.error.main,
                borderRadius: 1,
                boxShadow: `0 0 8px ${alpha(theme.palette.error.main, 0.5)}`,
                zIndex: 1,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.disabled" fontWeight={700}>0</Typography>
            <Typography
              variant="caption"
              sx={{
                position: 'relative',
                left: `${thresholdPercentage - 50}%`,
                color: theme.palette.error.main,
                fontWeight: 800,
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              Threshold ({threshold})
            </Typography>
            <Typography variant="caption" color="text.disabled" fontWeight={700}>100</Typography>
          </Box>
        </Paper>

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3, fontWeight: 600 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 500 }}>
            {error}
          </Alert>
        )}

        {/* Stamp Cards Grid */}
        <Typography variant="h6" fontWeight={800} sx={{ mb: 3, fontFamily: '"Orbitron", sans-serif', fontSize: '1.1rem' }}>
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
                    border: 1,
                    borderColor: verified ? alpha(primaryMain, 0.4) : 'divider',
                    background: verified
                      ? (isDark ? `linear-gradient(135deg, ${alpha(primaryMain, 0.08)} 0%, transparent 100%)` : `linear-gradient(135deg, ${alpha(primaryMain, 0.04)} 0%, transparent 100%)`)
                      : 'background.paper',
                    borderRadius: 3,
                    backgroundImage: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: primaryMain,
                      transform: 'translateY(-4px)',
                      boxShadow: isDark ? `0 4px 20px ${alpha(primaryMain, 0.1)}` : '0 4px 12px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box
                      sx={{
                        color: verified ? primaryMain : 'text.disabled',
                        opacity: verified ? 1 : 0.7,
                      }}
                    >
                      {stamp.icon}
                    </Box>
                    {verified ? (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: '0.9rem !important' }} />}
                        label="VERIFIED"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 800, fontSize: '0.6rem', height: 22, letterSpacing: 0.5 }}
                      />
                    ) : (
                      <Chip
                        label={`+${stamp.weight} PTS`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 800, fontSize: '0.6rem', height: 22, letterSpacing: 0.5, border: 1, borderColor: 'divider' }}
                      />
                    )}
                  </Box>

                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    {stamp.label}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, flex: 1, fontWeight: 500, lineHeight: 1.6 }}>
                    {stamp.description}
                  </Typography>

                  {verified ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: alpha(primaryMain, 0.05), border: 1, borderColor: alpha(primaryMain, 0.1) }}>
                      <VerifiedUserIcon sx={{ color: primaryMain, fontSize: 16 }} />
                      <Typography variant="caption" sx={{ color: primaryMain, fontWeight: 800 }}>
                        EARNED {earnedWeight} POINTS
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
                        borderColor: alpha(primaryMain, 0.3),
                        color: primaryMain,
                        fontWeight: 700,
                        py: 1,
                        '&:hover': {
                          borderColor: primaryMain,
                          background: alpha(primaryMain, 0.08),
                        },
                      }}
                    >
                      {verifyingStamp === stamp.type ? 'Verifying...' : 'Verify Now'}
                    </Button>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </>
  );
}
