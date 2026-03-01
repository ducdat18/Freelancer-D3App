import { Box, Typography, Grid } from '@mui/material';
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
  const color = stat.color || '#00ffc3';

  return (
    <MotionBox
      variants={staggerChild}
      sx={{
        position: 'relative',
        background: 'rgba(7, 5, 17, 0.9)',
        border: `1px solid ${color}22`,
        borderRadius: 2,
        p: 2.5,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: `${color}55`,
          boxShadow: `0 0 20px ${color}15`,
        },
        // HUD corner brackets
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 4,
          left: 4,
          width: 12,
          height: 12,
          borderTop: `2px solid ${color}66`,
          borderLeft: `2px solid ${color}66`,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: 12,
          height: 12,
          borderBottom: `2px solid ${color}66`,
          borderRight: `2px solid ${color}66`,
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
          textShadow: `0 0 10px ${color}40`,
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
              color: `${color}99`,
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
          color: 'rgba(224, 230, 237, 0.4)',
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
