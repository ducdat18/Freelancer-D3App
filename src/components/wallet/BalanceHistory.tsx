import { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  AccountBalanceWallet,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  OpenInNew,
  ShowChart,
} from '@mui/icons-material';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useBalanceHistory, BalanceHistoryPoint } from '../../hooks/useBalanceHistory';

const explorerTx = (sig: string) =>
  `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

const fmtSol = (n: number, digits = 4) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });

const fmtTime = (blockTime: number | null) => {
  if (!blockTime) return '—';
  return new Date(blockTime * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** Lightweight dependency-free sparkline of balance-after over time. */
function Sparkline({ points, color }: { points: BalanceHistoryPoint[]; color: string }) {
  const W = 640;
  const H = 120;
  const PAD = 8;

  const path = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.balanceAfter);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = (W - PAD * 2) / (points.length - 1);

    const coords = values.map((v, i) => {
      const x = PAD + i * stepX;
      const y = PAD + (H - PAD * 2) * (1 - (v - min) / range);
      return [x, y] as const;
    });

    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${H - PAD} L${coords[0][0].toFixed(1)},${H - PAD} Z`;
    return { line, area, coords };
  }, [points]);

  if (!path) {
    return (
      <Box sx={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Not enough data to plot a trend yet.
        </Typography>
      </Box>
    );
  }

  const last = path.coords[path.coords.length - 1];

  return (
    <Box component="svg" viewBox={`0 0 ${W} ${H}`} sx={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill="url(#balFill)" />
      <path d={path.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={color} />
    </Box>
  );
}

export default function BalanceHistory() {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const { balance, loading: balLoading, refetch: refetchBalance } = useWalletBalance();
  const { history, loading: histLoading, error, refetch: refetchHistory } = useBalanceHistory(25);

  const refetchAll = () => { refetchBalance(); refetchHistory(); };

  const netChange = useMemo(
    () => history.reduce((sum, p) => sum + p.change, 0),
    [history],
  );

  // Newest first for the list.
  const rows = useMemo(() => [...history].reverse(), [history]);

  return (
    <Box>
      {/* Current balance */}
      <Paper
        sx={{
          p: 3, mb: 3,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(0,255,195,0.08), rgba(0,255,195,0.02))'
            : 'linear-gradient(135deg, rgba(0,166,128,0.08), rgba(0,166,128,0.02))',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(0,255,195,0.25)' : 'rgba(0,166,128,0.25)'}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccountBalanceWallet sx={{ color: accent, fontSize: 22 }} />
              <Typography variant="body2" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                CURRENT BALANCE
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              {balLoading && balance === null ? (
                <CircularProgress size={28} sx={{ color: accent }} />
              ) : (
                <Typography variant="h3" fontWeight={700} sx={{ fontFamily: '"Orbitron", sans-serif', color: accent }}>
                  {balance !== null ? fmtSol(balance) : '—'}
                </Typography>
              )}
              <Typography variant="h6" color="text.secondary">SOL</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">Solana Devnet</Typography>
          </Box>

          <Tooltip title="Refresh">
            <IconButton onClick={refetchAll} size="small" sx={{ color: accent }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Trend */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChart color="primary" />
            <Typography variant="h6" fontWeight={700}>Balance Trend</Typography>
          </Box>
          {history.length > 0 && (
            <Chip
              size="small"
              icon={netChange >= 0 ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
              label={`${netChange >= 0 ? '+' : ''}${fmtSol(netChange)} SOL over last ${history.length} tx`}
              color={netChange >= 0 ? 'success' : 'error'}
              variant="outlined"
            />
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        {histLoading && history.length === 0 ? (
          <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={24} sx={{ color: accent }} />
          </Box>
        ) : (
          <Sparkline points={history} color={accent} />
        )}
      </Paper>

      {/* Transaction history */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>Transaction History</Typography>
        <Divider sx={{ mb: 1 }} />

        {error && (
          <Typography variant="body2" color="error" sx={{ py: 2 }}>{error}</Typography>
        )}

        {!error && rows.length === 0 && !histLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No transactions found for this wallet yet.
          </Typography>
        )}

        {rows.map((p) => {
          const positive = p.change >= 0;
          const changeColor = p.failed
            ? theme.palette.text.disabled
            : positive ? theme.palette.success.main : theme.palette.error.main;
          return (
            <Box
              key={p.signature}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{
                  width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: positive ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.12)',
                  color: changeColor,
                }}
              >
                {positive ? <ArrowDownward sx={{ fontSize: 18 }} /> : <ArrowUpward sx={{ fontSize: 18 }} />}
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.8rem' }} noWrap>
                    {p.signature.slice(0, 8)}...{p.signature.slice(-8)}
                  </Typography>
                  {p.failed && <Chip label="Failed" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />}
                </Box>
                <Typography variant="caption" color="text.secondary">{fmtTime(p.blockTime)}</Typography>
              </Box>

              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: changeColor, fontFamily: 'monospace' }}>
                  {positive ? '+' : ''}{fmtSol(p.change)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {fmtSol(p.balanceAfter)} SOL
                </Typography>
              </Box>

              <Tooltip title="View on Solana Explorer">
                <IconButton size="small" component="a" href={explorerTx(p.signature)} target="_blank" rel="noopener noreferrer">
                  <OpenInNew sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}

        {histLoading && rows.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={18} sx={{ color: accent }} />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
