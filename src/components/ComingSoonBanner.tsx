import { Box, Typography, Chip } from '@mui/material'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'

interface Props {
  feature: string
  description?: string
}

export default function ComingSoonBanner({ feature, description }: Props) {
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
        label="COMING SOON"
        size="small"
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          bgcolor: 'rgba(0,255,195,0.1)',
          color: 'primary.main',
          border: '1px solid rgba(0,255,195,0.3)',
        }}
      />
      <Typography variant="h5" fontWeight={700}>
        {feature}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description ||
          'This feature is under development and will be available after the smart contract is deployed to mainnet.'}
      </Typography>
    </Box>
  )
}
