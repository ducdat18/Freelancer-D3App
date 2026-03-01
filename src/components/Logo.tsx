import { Box } from '@mui/material'

interface LogoProps {
  size?: number
  showText?: boolean
}

export default function Logo({ size = 40, showText = true }: LogoProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* Logo Icon */}
      <Box
        sx={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer hexagon */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Glow filter */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#00ffc3', stopOpacity: 0.9 }} />
              <stop offset="100%" style={{ stopColor: '#8084ee', stopOpacity: 0.5 }} />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background hexagon */}
          <path
            d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z"
            stroke="url(#logoGradient)"
            strokeWidth="2"
            fill="rgba(0, 255, 195, 0.03)"
            filter="url(#neonGlow)"
          />

          {/* Inner hexagon */}
          <path
            d="M50 20 L75 35 L75 65 L50 80 L25 65 L25 35 Z"
            stroke="url(#logoGradient)"
            strokeWidth="1.5"
            fill="rgba(0, 255, 195, 0.06)"
          />

          {/* Chain link - left */}
          <circle cx="35" cy="50" r="8" stroke="#00ffc3" strokeWidth="2" fill="none" filter="url(#neonGlow)" />

          {/* Chain link - right */}
          <circle cx="65" cy="50" r="8" stroke="#8084ee" strokeWidth="2" fill="none" filter="url(#neonGlow)" />

          {/* Connection line */}
          <line x1="43" y1="50" x2="57" y2="50" stroke="url(#logoGradient)" strokeWidth="2" filter="url(#neonGlow)" />
        </svg>
      </Box>

      {/* Logo Text */}
      {showText && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1,
          }}
        >
          <Box
            component="span"
            sx={{
              fontSize: size * 0.4,
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #00ffc3 0%, #8084ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            FreelanceChain
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: size * 0.2,
              fontFamily: '"Rajdhani", sans-serif',
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: '#00ffc3',
              textTransform: 'uppercase',
              textShadow: '0 0 8px rgba(0, 255, 195, 0.3)',
            }}
          >
            Decentralized
          </Box>
        </Box>
      )}
    </Box>
  )
}
