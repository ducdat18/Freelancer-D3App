/**
 * TransactionProgress - SCI-FI themed transaction progress dialog
 *
 * Displays a neon-styled dialog showing transaction state:
 * - Preparing → Signing → Confirming → Confirmed / Error
 * - Animated neon ring progress indicator
 * - Terminal-style status messages
 * - Explorer link on confirmation
 */

import { Dialog, DialogContent, Box, Typography, IconButton, Link, useTheme } from '@mui/material';
import { Close, CheckCircle, ErrorOutline, OpenInNew } from '@mui/icons-material';
import type { TransactionState } from '../../hooks/useTransactionProgress';

interface TransactionProgressProps {
  open: boolean;
  state: TransactionState;
  onClose: () => void;
  explorerUrl?: string;
}

function ProgressRing({ status, color }: { status: string; color: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const isAnimating = ['preparing', 'signing', 'confirming'].includes(status);
  const isComplete = status === 'confirmed';
  const isError = status === 'error';

  const offset = isComplete ? 0 : isError ? circumference : circumference * 0.25;

  return (
    <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto', mb: 3 }}>
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={isDark ? `${color}15` : 'rgba(0,0,0,0.05)'}
          strokeWidth="4"
        />
        {/* Progress ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s ease',
            filter: isDark ? `drop-shadow(0 0 6px ${color}60)` : 'none',
            ...(isAnimating
              ? {
                  animation: 'txSpin 1.5s linear infinite',
                }
              : {}),
          }}
        />
        <defs>
          <style>{`
            @keyframes txSpin {
              0% { stroke-dashoffset: ${circumference * 0.25}; transform: rotate(0deg); transform-origin: 60px 60px; }
              50% { stroke-dashoffset: ${circumference * 0.6}; }
              100% { stroke-dashoffset: ${circumference * 0.25}; transform: rotate(360deg); transform-origin: 60px 60px; }
            }
          `}</style>
        </defs>
      </svg>

      {/* Center icon */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {isComplete && (
          <CheckCircle sx={{ fontSize: 40, color: theme.palette.success.main }} />
        )}
        {isError && (
          <ErrorOutline sx={{ fontSize: 40, color: theme.palette.error.main }} />
        )}
        {isAnimating && (
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: color,
              animation: 'txPulse 1s ease-in-out infinite',
              boxShadow: isDark ? `0 0 12px ${color}80` : `0 0 8px ${color}40`,
              '@keyframes txPulse': {
                '0%, 100%': { opacity: 0.4, transform: 'scale(0.8)' },
                '50%': { opacity: 1, transform: 'scale(1.2)' },
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
}

export default function TransactionProgress({
  open,
  state,
  onClose,
  explorerUrl,
}: TransactionProgressProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const STATUS_CONFIG: Record<
    string,
    { color: string; label: string; icon?: 'check' | 'error' }
  > = {
    idle: { color: theme.palette.info.main, label: 'IDLE' },
    preparing: { color: theme.palette.info.main, label: 'PREPARING' },
    signing: { color: theme.palette.warning.main, label: 'AWAITING SIGNATURE' },
    confirming: { color: theme.palette.primary.main, label: 'CONFIRMING' },
    confirmed: { color: theme.palette.primary.main, label: 'CONFIRMED', icon: 'check' },
    error: { color: theme.palette.error.main, label: 'ERROR', icon: 'error' },
  };

  const config = STATUS_CONFIG[state.status] || STATUS_CONFIG.idle;
  const canClose = state.status === 'confirmed' || state.status === 'error' || state.status === 'idle';

  const solscanUrl = state.signature
    ? explorerUrl || `https://solscan.io/tx/${state.signature}?cluster=devnet`
    : null;

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : undefined}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: isDark ? 'rgba(7, 5, 17, 0.95)' : 'background.paper',
          border: 1,
          borderColor: isDark ? `${config.color}30` : 'divider',
          borderRadius: 3,
          backdropFilter: 'blur(20px)',
          overflow: 'visible',
          backgroundImage: 'none',
        },
      }}
    >
      <DialogContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
        {/* Close button (only when closable) */}
        {canClose && (
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.disabled',
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        )}

        {/* Status label */}
        <Typography
          sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.65rem',
            letterSpacing: '0.15em',
            color: config.color,
            opacity: 0.8,
            textTransform: 'uppercase',
            mb: 3,
            fontWeight: 700,
          }}
        >
          {config.label}
        </Typography>

        {/* Progress ring */}
        <ProgressRing status={state.status} color={config.color} />

        {/* Status message */}
        <Typography
          sx={{
            fontFamily: '"Rajdhani", sans-serif',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'text.primary',
            mb: 1,
          }}
        >
          {state.message}
        </Typography>

        {/* Error details */}
        {state.error && state.status === 'error' && (
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.75rem',
              color: theme.palette.error.main,
              mt: 1,
              p: 1.5,
              borderRadius: 1,
              bgcolor: isDark ? 'rgba(255, 0, 255, 0.05)' : 'rgba(255, 0, 255, 0.02)',
              border: 1,
              borderColor: `${theme.palette.error.main}20`,
              wordBreak: 'break-word',
            }}
          >
            {state.error}
          </Typography>
        )}

        {/* Signature / Explorer link */}
        {state.signature && solscanUrl && (
          <Box sx={{ mt: 2 }}>
            <Link
              href={solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.7rem',
                color: theme.palette.info.main,
                textDecoration: 'none',
                fontWeight: 700,
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            >
              {state.signature.slice(0, 8)}...{state.signature.slice(-8)}
              <OpenInNew sx={{ fontSize: 14 }} />
            </Link>
          </Box>
        )}

        {/* Terminal-style step indicator */}
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'center',
            gap: 1.5,
          }}
        >
          {(['preparing', 'signing', 'confirming', 'confirmed'] as const).map(
            (step, i) => {
              const steps = ['preparing', 'signing', 'confirming', 'confirmed'];
              const currentIdx = steps.indexOf(state.status);
              const stepIdx = i;
              const isActive = stepIdx === currentIdx;
              const isDone = stepIdx < currentIdx;
              const isErr = state.status === 'error';

              let dotColor = isDark ? 'rgba(224, 230, 237, 0.15)' : 'rgba(0, 0, 0, 0.1)';
              if (isDone) dotColor = theme.palette.success.main;
              if (isActive && !isErr) dotColor = config.color;
              if (isErr && stepIdx <= currentIdx) dotColor = theme.palette.error.main;

              return (
                <Box
                  key={step}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: dotColor,
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? (isDark ? `0 0 8px ${dotColor}` : 'none') : 'none',
                    border: isDark ? 0 : (isActive || isDone ? 0 : 1),
                    borderColor: 'divider',
                  }}
                />
              );
            }
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
