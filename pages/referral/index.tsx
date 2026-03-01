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
import { useWallet } from '@solana/wallet-adapter-react';
import { web3 } from '@coral-xyz/anchor';
import Layout from '../../src/components/Layout';
import LoadingSpinner from '../../src/components/LoadingSpinner';
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
  return (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${accent}0d 0%, ${accent}05 100%)`,
        border: `1px solid ${accent}26`,
        borderRadius: 2,
      }}
    >
      <Box sx={{ color: accent, mb: 1 }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
        {label.toUpperCase()}
      </Typography>
      <Typography variant="h4" fontWeight={700} sx={{ fontFamily: '"Orbitron", monospace', color: accent }}>
        {value}
      </Typography>
    </Paper>
  );
}

// ─── step card ────────────────────────────────────────────────────────────────
function StepCard({ number, icon, title, desc }: { number: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Box sx={{ textAlign: 'center', px: 1 }}>
      <Box
        sx={{
          width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,255,195,0.08)',
          border: '1.5px solid rgba(0,255,195,0.3)',
          color: '#00ffc3',
          fontSize: '1.4rem',
        }}
      >
        {icon}
      </Box>
      <Chip
        label={`STEP ${number}`}
        size="small"
        sx={{
          mb: 1,
          fontFamily: '"Orbitron", monospace',
          fontSize: '0.55rem',
          letterSpacing: '0.1em',
          bgcolor: 'rgba(0,255,195,0.07)',
          color: 'rgba(0,255,195,0.7)',
          border: '1px solid rgba(0,255,195,0.2)',
        }}
      />
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
        {desc}
      </Typography>
    </Box>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Referral() {
  const { program } = useSolanaProgram();
  // @ts-ignore
  const isOnChainDeployed = typeof program?.methods?.registerReferral === 'function';

  const { publicKey, connected } = useWallet();
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
  const totalReferrals = referralAccount?.referralCount ?? 0;
  const totalEarnings = referralAccount
    ? (referralAccount.totalEarnings / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : '0';

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!connected) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>Referral Program</Typography>
          <Alert severity="info">Connect your wallet to access the referral program.</Alert>
        </Container>
      </Layout>
    );
  }

  if (initialLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <LoadingSpinner
            message="Loading referral data..."
            logs={[
              { text: 'PDA: REFERRAL_CONFIG seed=[referral-config]', type: 'info' },
              { text: 'PDA: REFERRAL_ACCOUNT seed=[referral, wallet]', type: 'info' },
              { text: 'Fetching commission rates and referral stats...', type: 'ok' },
            ]}
          />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* ── Header ── */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ShareIcon sx={{ color: '#00ffc3', fontSize: 32 }} />
            <Typography variant="h4" fontWeight={700}>Referral Program</Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Share your referral link — earn commissions every time a referred user completes a job on the platform.
          </Typography>
        </Box>

        {successMsg && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        )}
        {actionError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {/* ── Referral Link terminal card ── */}
        <Paper
          sx={{
            mb: 4,
            background: 'rgba(7,5,17,0.95)',
            border: '1px solid rgba(0,255,195,0.2)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* title bar */}
          <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0,255,195,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {['#ff00ff', '#e04d01', '#00ffc3'].map(c => (
                <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c, opacity: 0.8 }} />
              ))}
            </Box>
            <Typography sx={{ ml: 1, fontFamily: '"Orbitron", monospace', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'rgba(0,255,195,0.5)' }}>
              YOUR REFERRAL LINK
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              label="ACTIVE"
              size="small"
              sx={{
                height: 18, fontSize: '0.55rem', letterSpacing: '0.1em',
                fontFamily: '"Orbitron", monospace',
                bgcolor: 'rgba(0,255,195,0.12)', color: '#00ffc3',
                border: '1px solid rgba(0,255,195,0.3)',
              }}
            />
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Link display */}
            <Box
              sx={{
                fontFamily: '"JetBrains Mono","Fira Code","Courier New",monospace',
                fontSize: { xs: '0.72rem', sm: '0.85rem' },
                color: '#e0e6ed',
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 1,
                p: 2,
                wordBreak: 'break-all',
                mb: 2,
              }}
            >
              <Box component="span" sx={{ color: 'rgba(0,255,195,0.5)', mr: 1 }}>$</Box>
              {referralLink || '— connect wallet —'}
            </Box>

            {/* Actions row */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={handleCopy}
                disabled={!referralLink}
                color={copied ? 'success' : 'primary'}
                sx={{ minWidth: 160 }}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>

              <Tooltip title="Share on Twitter / X">
                <Button
                  variant="outlined"
                  startIcon={<TwitterIcon />}
                  onClick={handleShareTwitter}
                  disabled={!referralLink}
                  size="small"
                  sx={{ borderColor: 'rgba(29,161,242,0.5)', color: '#1da1f2', '&:hover': { borderColor: '#1da1f2', bgcolor: 'rgba(29,161,242,0.07)' } }}
                >
                  Share
                </Button>
              </Tooltip>

              <Tooltip title="Share on Telegram">
                <Button
                  variant="outlined"
                  startIcon={<TelegramIcon />}
                  onClick={handleShareTelegram}
                  disabled={!referralLink}
                  size="small"
                  sx={{ borderColor: 'rgba(0,136,204,0.5)', color: '#0088cc', '&:hover': { borderColor: '#0088cc', bgcolor: 'rgba(0,136,204,0.07)' } }}
                >
                  Share
                </Button>
              </Tooltip>
            </Stack>

            {/* Referral code */}
            <Typography variant="caption" sx={{ mt: 2, display: 'block', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)' }}>
              code: {publicKey?.toBase58()}
            </Typography>
          </Box>
        </Paper>

        {/* ── Stats row ── */}
        <Grid container spacing={2} sx={{ mb: 5 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<PeopleIcon sx={{ fontSize: 36 }} />} label="Total Referrals" value={totalReferrals} accent="#00ffc3" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<PaidIcon sx={{ fontSize: 36 }} />} label="Total Earnings" value={`${totalEarnings} SOL`} accent="#8b5cf6" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<EmojiEventsIcon sx={{ fontSize: 36 }} />} label="Level 1 Rate" value={`${level1Pct}%`} accent="#00ffc3" />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<LinkIcon sx={{ fontSize: 36 }} />} label="Level 2 Rate" value={`${level2Pct}%`} accent="#f59e0b" />
          </Grid>
        </Grid>

        {/* ── How it works ── */}
        <Paper sx={{ p: 4, mb: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
            How It Works
          </Typography>
          <Grid container spacing={3}>
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
              mt: 3, p: 2, borderRadius: 1,
              background: 'rgba(0,255,195,0.04)',
              border: '1px solid rgba(0,255,195,0.12)',
              fontFamily: 'monospace', fontSize: '0.78rem',
            }}
          >
            <Box component="span" sx={{ color: 'rgba(0,255,195,0.6)', mr: 1 }}>{'>'}</Box>
            <Box component="span" sx={{ color: '#e0e6ed' }}>
              commission = job_amount × level_rate — paid automatically when escrow is released
            </Box>
          </Box>
        </Paper>

        {/* ── Your Referrer / Register sections ── */}
        {myReferrer || referralAccount?.referrer ? (
          <Paper sx={{ p: 3, background: 'rgba(0,255,195,0.03)', border: '1px solid rgba(0,255,195,0.15)', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Your Referrer</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip label="REGISTERED" color="success" size="small" sx={{ fontFamily: '"Orbitron", monospace', fontSize: '0.55rem', letterSpacing: '0.1em' }} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                {referralAccount?.referrer
                  ? shortAddr(String(referralAccount.referrer))
                  : myReferrer
                    ? shortAddr(myReferrer)
                    : '—'}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              This wallet will earn commissions when you complete jobs on the platform.
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Register Your Referrer</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Were you referred by someone? Enter their wallet address so they can earn commissions from your activity.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <TextField
                fullWidth
                label="Referrer Wallet Address"
                value={referrerInput}
                onChange={(e) => setReferrerInput(e.target.value)}
                placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                disabled={actionLoading}
                size="small"
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.82rem' } }}
              />
              <Button
                variant="contained"
                onClick={handleRegister}
                disabled={actionLoading || !referrerInput.trim()}
                sx={{ minWidth: 140, height: 40 }}
              >
                {actionLoading ? 'Registering...' : 'Register'}
              </Button>
            </Stack>

            {!isOnChainDeployed && (
              <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
                On-chain commission payouts activate after mainnet deployment. Your referral is tracked locally in the meantime.
              </Alert>
            )}
          </Paper>
        )}
      </Container>
    </Layout>
  );
}
