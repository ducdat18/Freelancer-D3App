import { Box, Typography } from '@mui/material';
import { formatSol } from '../../types/solana';

interface EscrowShieldProps {
  totalLocked: number;
  totalReleased: number;
  activeEscrows: number;
}

export default function EscrowShield({
  totalLocked = 0,
  totalReleased = 0,
  activeEscrows = 0,
}: EscrowShieldProps) {
  const total = totalLocked + totalReleased;
  const lockedPercent = total > 0 ? (totalLocked / total) * 100 : 0;

  // SVG ring calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (lockedPercent / 100) * circumference;

  return (
    <Box
      sx={{
        background: 'rgba(7, 5, 17, 0.9)',
        border: '1px solid rgba(0, 255, 195, 0.15)',
        borderRadius: 2,
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Title */}
      <Typography
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          color: 'rgba(0, 255, 195, 0.5)',
          textTransform: 'uppercase',
          mb: 2,
        }}
      >
        Escrow Shield
      </Typography>

      {/* Circular gauge */}
      <Box sx={{ position: 'relative', width: 180, height: 180, my: 1 }}>
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="rgba(0, 255, 195, 0.08)"
            strokeWidth="8"
          />
          {/* Active ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="url(#escrowGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.5s ease-out',
              filter: 'drop-shadow(0 0 6px rgba(0, 255, 195, 0.4))',
            }}
          />
          {/* Outer glow ring */}
          <circle
            cx="90"
            cy="90"
            r="82"
            fill="none"
            stroke="rgba(0, 255, 195, 0.04)"
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="escrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#00ffc3' }} />
              <stop offset="100%" style={{ stopColor: '#8084ee' }} />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#00ffc3',
              textShadow: '0 0 10px rgba(0, 255, 195, 0.3)',
              lineHeight: 1,
            }}
          >
            {formatSol(totalLocked)}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Rajdhani", sans-serif',
              fontSize: '0.7rem',
              color: 'rgba(224, 230, 237, 0.5)',
              letterSpacing: '0.08em',
              mt: 0.5,
            }}
          >
            SOL LOCKED
          </Typography>
        </Box>
      </Box>

      {/* Stats row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          mt: 2,
          pt: 2,
          borderTop: '1px solid rgba(0, 255, 195, 0.08)',
        }}
      >
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#8084ee',
            }}
          >
            {formatSol(totalReleased)}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: 'rgba(224, 230, 237, 0.4)',
              letterSpacing: '0.06em',
            }}
          >
            RELEASED
          </Typography>
        </Box>
        <Box
          sx={{
            width: '1px',
            bgcolor: 'rgba(0, 255, 195, 0.08)',
          }}
        />
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#00ffc3',
            }}
          >
            {activeEscrows}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.65rem',
              color: 'rgba(224, 230, 237, 0.4)',
              letterSpacing: '0.06em',
            }}
          >
            ACTIVE
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
