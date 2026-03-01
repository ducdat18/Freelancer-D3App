/**
 * TransactionProgress - SCI-FI themed transaction progress dialog
 *
 * Displays a neon-styled dialog showing transaction state:
 * - Preparing → Signing → Confirming → Confirmed / Error
 * - Animated neon ring progress indicator
 * - Terminal-style status messages
 * - Explorer link on confirmation
 */

import { Dialog, DialogContent, Box, Typography, IconButton, Link } from '@mui/material';
import { Close, CheckCircle, ErrorOutline, OpenInNew } from '@mui/icons-material';
import type { TransactionState } from '../../hooks/useTransactionProgress';

interface TransactionProgressProps {
  open: boolean;
  state: TransactionState;
  onClose: () => void;
  explorerUrl?: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; label: string; icon?: 'check' | 'error' }
> = {
  idle: { color: '#8084ee', label: 'IDLE' },
  preparing: { color: '#8084ee', label: 'PREPARING' },
  signing: { color: '#e04d01', label: 'AWAITING SIGNATURE' },
  confirming: { color: '#00ffc3', label: 'CONFIRMING' },
  confirmed: { color: '#00ffc3', label: 'CONFIRMED', icon: 'check' },
  error: { color: '#ff00ff', label: 'ERROR', icon: 'error' },
};

function ProgressRing({ status, color }: { status: string; color: string }) {
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
          stroke={`${color}15`}
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
            filter: `drop-shadow(0 0 6px ${color}60)`,
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
          <CheckCircle sx={{ fontSize: 40, color: '#00ffc3' }} />
        )}
        {isError && (
          <ErrorOutline sx={{ fontSize: 40, color: '#ff00ff' }} />
        )}
        {isAnimating && (
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: color,
              animation: 'txPulse 1s ease-in-out infinite',
              boxShadow: `0 0 12px ${color}80`,
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
          background: 'rgba(7, 5, 17, 0.95)',
          border: `1px solid ${config.color}30`,
          borderRadius: 3,
          backdropFilter: 'blur(20px)',
          overflow: 'visible',
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
              color: 'rgba(224, 230, 237, 0.4)',
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
            color: `${config.color}80`,
            textTransform: 'uppercase',
            mb: 3,
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
            fontWeight: 600,
            color: '#e0e6ed',
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
              color: '#ff00ff99',
              mt: 1,
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'rgba(255, 0, 255, 0.05)',
              border: '1px solid rgba(255, 0, 255, 0.1)',
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
                color: '#8084ee',
                textDecoration: 'none',
                '&:hover': {
                  color: '#00ffc3',
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
            borderTop: '1px solid rgba(0, 255, 195, 0.08)',
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

              let dotColor = 'rgba(224, 230, 237, 0.15)';
              if (isDone) dotColor = '#00ffc3';
              if (isActive && !isErr) dotColor = config.color;
              if (isErr && stepIdx <= currentIdx) dotColor = '#ff00ff';

              return (
                <Box
                  key={step}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: dotColor,
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? `0 0 8px ${dotColor}` : 'none',
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
