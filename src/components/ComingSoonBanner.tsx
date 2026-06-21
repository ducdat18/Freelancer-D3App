import { Box, Typography, Chip, useTheme } from '@mui/material'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'

interface Props {
  feature: string
  description?: string
}

export default function ComingSoonBanner({ feature, description }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const primaryMain = theme.palette.primary.main;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        gap: 2,
        textAlign: 'center',
      }}
    >
      <RocketLaunchIcon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.7 }} />
      <Chip
        label="IN PROGRESS"
        size="small"
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          bgcolor: isDark ? 'rgba(0,255,195,0.1)' : 'rgba(5,150,105,0.08)',
          color: primaryMain,
          border: 1,
          borderColor: isDark ? 'rgba(0,255,195,0.3)' : 'rgba(5,150,105,0.3)',
          fontWeight: 700,
        }}
      />
      <Typography variant="h5" fontWeight={700}>
        {feature}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description ||
          'This feature is being rolled out. Check back soon for updates.'}
      </Typography>
    </Box>
  )
}
