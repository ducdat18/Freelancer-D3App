import { Box, useTheme, alpha } from '@mui/material'
import { motion } from 'framer-motion'

interface LogoProps {
  size?: number
  showText?: boolean
}

const MotionSvg = motion.svg;
const MotionPath = motion.path;
const MotionG = motion.g;
const MotionCircle = motion.circle;

export default function Logo({ size = 40, showText = true }: LogoProps) {
  const theme = useTheme();
  const primaryMain = theme.palette.primary.main; // Cyber Teal
  const secondaryMain = theme.palette.secondary.main; // Electric Purple
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
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
        <MotionSvg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryMain} />
              <stop offset="100%" stopColor={secondaryMain} />
            </linearGradient>
            
            <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor={alpha(primaryMain, 0.15)} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            <filter id="hyperGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Ambient Background Glow */}
          <MotionCircle
            cx="50" cy="50" r="40"
            fill="url(#bgGlow)"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* 2. Rotating Orbital Data Ring */}
          <MotionCircle
            cx="50" cy="50" r="46"
            stroke={alpha(primaryMain, 0.1)}
            strokeWidth="0.5"
            strokeDasharray="1 15"
            strokeLinecap="round"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          <MotionCircle
            cx="50" cy="50" r="46"
            stroke={alpha(secondaryMain, 0.2)}
            strokeWidth="1"
            strokeDasharray="10 80"
            strokeLinecap="round"
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />

          {/* 3. Floating Data Nodes (Satellites) */}
          {[...Array(3)].map((_, i) => (
            <MotionCircle
              key={i}
              cx={50 + Math.cos(i * 2) * 42}
              cy={50 + Math.sin(i * 2) * 42}
              r="1.5"
              fill={i % 2 === 0 ? primaryMain : secondaryMain}
              filter="url(#hyperGlow)"
              animate={{
                cx: [50 + Math.cos(i * 2) * 42, 50 + Math.cos(i * 2 + 1) * 42],
                cy: [50 + Math.sin(i * 2) * 42, 50 + Math.sin(i * 2 + 1) * 42],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}

          {/* Background Technical Grid */}
          <g opacity="0.05">
             <path d="M10 30 H90 M10 50 H90 M10 70 H90 M30 10 V90 M50 10 V90 M70 10 V90" stroke={primaryMain} strokeWidth="0.5" strokeDasharray="2 2" />
          </g>

          {/* THE FRAGMENTED "L" SYMBOL */}
          <MotionG
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Shard 1: The "Blade" */}
            <MotionPath
              d="M50 15 L85 35 L50 45 L35 30 Z"
              fill="url(#shardGrad)"
              filter={isDark ? "url(#hyperGlow)" : "none"}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            {/* Shard 2: The "Core" */}
            <MotionPath
              d="M30 35 L45 45 V75 L20 60 V45 Z"
              fill={secondaryMain}
              opacity="0.9"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            />

            {/* Shard 3: The "Base" */}
            <MotionPath
              d="M30 78 L80 78 L70 90 H20 L30 78 Z"
              fill={primaryMain}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            />

            {/* Connecting Tech-Link */}
            <MotionPath
              d="M55 55 L75 55"
              stroke={primaryMain}
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              opacity="0.6"
            />
          </MotionG>

          {/* Pulse Effect around the core */}
          <motion.circle
            cx="35" cy="55" r="15"
            stroke={primaryMain}
            strokeWidth="0.5"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        </MotionSvg>
      </Box>

      {/* Logo Text - Sharp & Institutional */}
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
              fontSize: size * 0.5,
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 800,
              letterSpacing: '0.15em',
              color: 'text.primary',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            LANCER
            <Box 
              sx={{ 
                width: 4, height: 4, bgcolor: primaryMain, ml: 1,
                boxShadow: `0 0 10px ${primaryMain}`
              }} 
            />
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: size * 0.22,
              fontFamily: '"Rajdhani", sans-serif',
              fontWeight: 700,
              letterSpacing: '0.45em',
              color: alpha(theme.palette.text.secondary, 0.7),
              textTransform: 'uppercase',
              mt: 0.5,
            }}
          >
            LABORATORY
          </Box>
        </Box>
      )}
    </Box>
  )
}
