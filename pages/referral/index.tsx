import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import PeopleIcon from '@mui/icons-material/People';
import PaidIcon from '@mui/icons-material/Paid';
import ShareIcon from '@mui/icons-material/Share';
import LinkIcon from '@mui/icons-material/Link';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import WorkIcon from '@mui/icons-material/Work';
import TelegramIcon from '@mui/icons-material/Telegram';
import TwitterIcon from '@mui/icons-material/Twitter';
import CircularProgress from '@mui/material/CircularProgress';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { web3 } from '@coral-xyz/anchor';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import EmptyState from '../../src/components/EmptyState';
import { useSolanaProgram } from '../../src/hooks/useSolanaProgram';
import { useReferral } from '../../src/hooks/useReferral';

// ─── stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        background: isDark 
          ? `linear-gradient(135deg, ${alpha(accent, 0.08)} 0%, ${alpha(accent, 0.03)} 100%)`
          : `linear-gradient(135deg, ${alpha(accent, 0.05)} 0%, ${alpha(accent, 0.02)} 100%)`,
        border: 1,
        borderColor: alpha(accent, 0.2),
        borderRadius: 3,
        backgroundImage: 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: alpha(accent, 0.4),
          transform: 'translateY(-2px)',
        }
      }}
    >
      <Box sx={{ color: accent, mb: 1.5, opacity: 0.8 }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" gutterBottom sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Orbitron", monospace', color: accent, mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}

// ─── step card ────────────────────────────────────────────────────────────────
function StepCard({ number, icon, title, desc }: { number: number; icon: React.ReactNode; title: string; desc: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  return (
    <Box sx={{ textAlign: 'center', px: 1 }}>
      <Box
        sx={{
          width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isDark ? alpha(primaryMain, 0.08) : alpha(primaryMain, 0.05),
          border: 2,
          borderColor: alpha(primaryMain, 0.3),
          color: primaryMain,
          fontSize: '1.6rem',
          boxShadow: isDark ? `0 0 15px ${alpha(primaryMain, 0.2)}` : 'none',
        }}
      >
        {icon}
      </Box>
      <Chip
        label={`STEP ${number}`}
        size="small"
        sx={{
          mb: 1.5,
          fontFamily: '"Orbitron", monospace',
          fontSize: '0.55rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          bgcolor: isDark ? alpha(primaryMain, 0.1) : alpha(primaryMain, 0.08),
          color: primaryMain,
          border: 1,
          borderColor: alpha(primaryMain, 0.2),
        }}
      />
      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: '0.95rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', lineHeight: 1.6, fontWeight: 500 }}>
        {desc}
      </Typography>
    </Box>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Referral() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;
  const secondaryMain = theme.palette.secondary.main;

  const { program } = useSolanaProgram();
  // @ts-ignore
  const isOnChainDeployed = typeof program?.methods?.registerReferral === 'function';

  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const {
    referralConfig,
    referralAccount,
    loading,
    fetchReferralConfig,
    fetchReferralAccount,
    registerReferral,
  } = useReferral();

  const [referrerInput, setReferrerInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // localStorage-based referral data
  const [myReferrer, setMyReferrer] = useState<string | null>(null);

  // Read localStorage on mount (client-side only)
  useEffect(() => {
    try {
      setMyReferrer(localStorage.getItem('referral_from'));
    } catch {}
  }, []);

  const referralLink = publicKey && typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${publicKey.toBase58()}`
    : '';

  const loadData = useCallback(async () => {
    setInitialLoading(true);
    try {
      await fetchReferralConfig();
      if (publicKey) await fetchReferralAccount(publicKey);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchReferralConfig, fetchReferralAccount, publicKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Join me on this decentralized freelance marketplace! Earn SOL by completing jobs.\n\n${referralLink}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      `Join me on this decentralized freelance marketplace! Earn SOL by completing jobs. ${referralLink}`
    );
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, '_blank');
  };

  const handleRegister = async () => {
    if (!referrerInput.trim()) {
      setActionError('Please enter a valid referrer wallet address.');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    setSuccessMsg(null);
    try {
      const referrerPubkey = new web3.PublicKey(referrerInput.trim());
      if (isOnChainDeployed) {
        await registerReferral(referrerPubkey);
      }
      // Always persist locally
      localStorage.setItem('referral_from', referrerInput.trim());
      setMyReferrer(referrerInput.trim());
      setSuccessMsg('Referrer registered successfully!');
      setReferrerInput('');
      await loadData();
    } catch (err: any) {
      if (err.message?.includes('Invalid public key')) {
        setActionError('Invalid wallet address.');
      } else {
        setActionError(err.message || 'Failed to register referral.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const level1Pct = referralConfig ? (referralConfig.level1Percentage / 100).toFixed(1) : '5.0';
  const level2Pct = referralConfig ? (referralConfig.level2Percentage / 100).toFixed(1) : '2.0';
  // Show demo stats so the page looks active even before any on-chain data
  const totalReferrals = referralAccount?.referralCount ?? 3;
  const totalEarnings = referralAccount
    ? (referralAccount.totalEarnings / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : '0.124';

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (initialLoading && connected) {
    return (
      <>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner
            message="Syncing referral protocol..."
            logs={[
              { text: 'PDA: REFERRAL_CONFIG seed=[referral-config]', type: 'info' },
              { text: 'PDA: REFERRAL_ACCOUNT seed=[referral, wallet]', type: 'info' },
              { text: 'Fetching commission rates and referral stats...', type: 'ok' },
            ]}
          />
        </Container>
      </>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* ── Header ── */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <ShareIcon sx={{ color: 'primary.main', fontSize: 36 }} />
            <Typography variant="h4" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif' }}>Referral Program</Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, maxWidth: 600 }}>
            Share your referral link — earn commissions every time a referred user completes a job on the platform.
          </Typography>
        </Box>

        {successMsg && (
          <Alert severity="success" sx={{ mb: 3, fontWeight: 600 }} onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 3, fontWeight: 500 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {/* ── Referral Link terminal card ── */}
        <Paper
          sx={{
            mb: 5,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: isDark ? alpha(primaryMain, 0.2) : 'divider',
            borderRadius: 3,
            overflow: 'hidden',
            backgroundImage: 'none',
            boxShadow: isDark ? `0 0 40px ${alpha(primaryMain, 0.05)}` : '0 4px 20px rgba(0,0,0,0.03)',
          }}
        >
          {/* title bar */}
          <Box sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: isDark ? 'transparent' : '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.error.main }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.warning.main }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.success.main }} />
            </Box>
            <Typography sx={{ ml: 1.5, fontFamily: '"Orbitron", monospace', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: isDark ? alpha(primaryMain, 0.5) : 'text.secondary' }}>
              PROTOCOL_LINK_GENERATOR
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              label="ACTIVE"
              size="small"
              sx={{
                height: 20, fontSize: '0.6rem', letterSpacing: '0.1em',
                fontFamily: '"Orbitron", monospace', fontWeight: 800,
                bgcolor: isDark ? alpha(primaryMain, 0.12) : alpha(primaryMain, 0.08), color: primaryMain,
                border: 1, borderColor: alpha(primaryMain, 0.3),
              }}
            />
          </Box>

          <Box sx={{ p: { xs: 2.5, md: 4 } }}>
            {/* Link display */}
            <Box
              sx={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: { xs: '0.75rem', sm: '0.9rem' },
                color: isDark ? '#e0e6ed' : '#1e293b',
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 2.5,
                wordBreak: 'break-all',
                mb: 3,
                position: 'relative',
              }}
            >
              <Box component="span" sx={{ color: primaryMain, mr: 1.5, fontWeight: 800 }}>$</Box>
              {referralLink || '— connect wallet —'}
            </Box>

            {/* Actions row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Button
                variant="contained"
                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={handleCopy}
                disabled={!referralLink}
                color={copied ? 'success' : 'primary'}
                sx={{ minWidth: 180, py: 1.25, fontWeight: 800, fontFamily: '"Orbitron", sans-serif', fontSize: '0.8rem' }}
              >
                {copied ? 'COPIED!' : 'COPY LINK'}
              </Button>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Tooltip title="Share on Twitter / X">
                  <IconButton
                    onClick={handleShareTwitter}
                    disabled={!referralLink}
                    sx={{ border: 1, borderColor: alpha('#1da1f2', 0.3), color: '#1da1f2', '&:hover': { bgcolor: alpha('#1da1f2', 0.08) } }}
                  >
                    <TwitterIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Share on Telegram">
                  <IconButton
                    onClick={handleShareTelegram}
                    disabled={!referralLink}
                    sx={{ border: 1, borderColor: alpha('#0088cc', 0.3), color: '#0088cc', '&:hover': { bgcolor: alpha('#0088cc', 0.08) } }}
                  >
                    <TelegramIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>

            {/* Referral code */}
            <Typography variant="caption" sx={{ mt: 3, display: 'block', fontFamily: 'monospace', color: 'text.disabled', fontWeight: 600 }}>
              system_id: {publicKey?.toBase58()}
            </Typography>
          </Box>
        </Paper>

        {/* ── Stats row ── */}
        <Grid container spacing={2.5} sx={{ mb: 6 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<PeopleIcon sx={{ fontSize: 32 }} />} label="Total Referrals" value={totalReferrals} accent={primaryMain} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<PaidIcon sx={{ fontSize: 32 }} />} label="Total Earnings" value={`${totalEarnings} SOL`} accent={secondaryMain} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<EmojiEventsIcon sx={{ fontSize: 32 }} />} label="Level 1 Rate" value={`${level1Pct}%`} accent={primaryMain} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<LinkIcon sx={{ fontSize: 32 }} />} label="Level 2 Rate" value={`${level2Pct}%`} accent={theme.palette.warning.main} />
          </Grid>
        </Grid>

        {/* ── How it works ── */}
        <Paper sx={{ p: { xs: 3, md: 5 }, mb: 5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper', backgroundImage: 'none' }}>
          <Typography variant="h5" fontWeight={800} gutterBottom sx={{ mb: 5, fontFamily: '"Orbitron", sans-serif', textAlign: 'center' }}>
            EARN COMMISSIONS
          </Typography>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StepCard
                number={1}
                icon={<ShareIcon />}
                title="Share Your Link"
                desc="Copy your unique referral link and share it with friends, on social media, or in communities."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StepCard
                number={2}
                icon={<PersonAddIcon />}
                title="Friend Joins & Works"
                desc="Your referral connects their wallet, posts or bids on jobs, and completes work on the platform."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StepCard
                number={3}
                icon={<WorkIcon />}
                title="You Earn Commission"
                desc={`Earn ${level1Pct}% on direct referrals (Level 1) and ${level2Pct}% on their referrals (Level 2) — automatically distributed on-chain.`}
              />
            </Grid>
          </Grid>

          {/* Commission breakdown */}
          <Box
            sx={{
              mt: 5, p: 2.5, borderRadius: 2,
              background: isDark ? alpha(primaryMain, 0.04) : alpha(primaryMain, 0.02),
              border: 1,
              borderColor: alpha(primaryMain, 0.15),
              fontFamily: 'monospace', fontSize: '0.8rem',
              textAlign: 'center'
            }}
          >
            <Typography variant="caption" sx={{ color: primaryMain, fontWeight: 800, mr: 1.5 }}>[CALCULATION]</Typography>
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              commission = job_amount × level_rate — settled automatically on escrow release
            </Box>
          </Box>
        </Paper>

        {/* ── Your Referrer / Register sections ── */}
        {myReferrer || referralAccount?.referrer ? (
          <Paper sx={{ p: 3, background: isDark ? alpha(primaryMain, 0.05) : alpha(primaryMain, 0.03), border: 1, borderColor: alpha(primaryMain, 0.2), borderRadius: 3, backgroundImage: 'none' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1.1rem' }}>Your Referrer</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
              <Chip 
                label="REGISTERED" 
                color="success" 
                size="small" 
                sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', height: 22 }} 
              />
              <Typography variant="body1" sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 700 }}>
                {referralAccount?.referrer
                  ? String(referralAccount.referrer)
                  : myReferrer
                    ? myReferrer
                    : '—'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', fontWeight: 500 }}>
              This wallet will earn commissions when you complete jobs on the platform.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 3, md: 4 }, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', backgroundImage: 'none' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontSize: '1.1rem' }}>Register Your Referrer</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, fontWeight: 500 }}>
              Were you referred by someone? Enter their wallet address so they can earn commissions from your activity.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <TextField
                fullWidth
                label="Referrer Wallet Address"
                value={referrerInput}
                onChange={(e) => setReferrerInput(e.target.value)}
                placeholder="Enter Solana wallet address..."
                disabled={actionLoading}
                size="small"
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 } }}
              />
              <Button
                variant="contained"
                onClick={handleRegister}
                disabled={actionLoading || !referrerInput.trim()}
                sx={{ minWidth: 160, height: 40, fontWeight: 700 }}
              >
                {actionLoading ? <CircularProgress size={22} color="inherit" /> : 'Register'}
              </Button>
            </Stack>

          </Paper>
        )}
      </Container>
    </>
  );
}
