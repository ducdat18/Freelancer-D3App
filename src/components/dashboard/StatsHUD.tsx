import { Box, Typography, Grid, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
  suffix?: string;
}

interface StatsHUDProps {
  stats: StatItem[];
}

function HUDStatCard({ stat, index }: { stat: StatItem; index: number }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const color = stat.color || theme.palette.primary.main;

  return (
    <MotionBox
      variants={staggerChild}
      sx={{
        position: 'relative',
        background: theme.palette.background.paper,
        border: `1px solid ${isDark ? color + '22' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.03)',
        borderRadius: 2,
        p: 2.5,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: isDark ? `${color}55` : color,
          boxShadow: isDark ? `0 0 20px ${color}15` : '0 4px 20px rgba(0,0,0,0.08)',
        },
        // HUD corner brackets
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 4,
          left: 4,
          width: 12,
          height: 12,
          borderTop: `2px solid ${isDark ? color + '66' : color + '40'}`,
          borderLeft: `2px solid ${isDark ? color + '66' : color + '40'}`,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: 12,
          height: 12,
          borderBottom: `2px solid ${isDark ? color + '66' : color + '40'}`,
          borderRight: `2px solid ${isDark ? color + '66' : color + '40'}`,
        },
      }}
    >
      {/* Stat value */}
      <Typography
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: color,
          textShadow: isDark ? `0 0 10px ${color}40` : 'none',
          lineHeight: 1.2,
        }}
      >
        {stat.value}
        {stat.suffix && (
          <Box
            component="span"
            sx={{
              fontSize: '0.7rem',
              ml: 0.5,
              color: isDark ? `${color}99` : `${color}cc`,
              fontWeight: 500,
            }}
          >
            {stat.suffix}
          </Box>
        )}
      </Typography>

      {/* Label */}
      <Typography
        sx={{
          fontFamily: '"Rajdhani", sans-serif',
          fontSize: '0.7rem',
          color: theme.palette.text.secondary,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mt: 1,
          fontWeight: 600,
        }}
      >
        {stat.label}
      </Typography>

      {/* Subtle scan line effect */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
        }}
      />
    </MotionBox>
  );
}

export default function StatsHUD({ stats }: StatsHUDProps) {
  return (
    <MotionBox
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <Grid container spacing={2}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 6, sm: 3 }} key={index}>
            <HUDStatCard stat={stat} index={index} />
          </Grid>
        ))}
      </Grid>
    </MotionBox>
  );
}
