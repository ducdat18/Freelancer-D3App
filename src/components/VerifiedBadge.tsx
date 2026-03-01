import { Box, Typography, Tooltip } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

interface VerifiedBadgeProps {
  /** 'sm' = icon only (for cards), 'md' = icon + label (for profiles) */
  size?: 'sm' | 'md';
  tooltip?: boolean;
}

export default function VerifiedBadge({ size = 'md', tooltip = true }: VerifiedBadgeProps) {
  const badge = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: size === 'md' ? 1 : 0.5,
        py: size === 'md' ? 0.3 : 0.25,
        borderRadius: 1,
        bgcolor: 'rgba(76,175,80,0.08)',
        border: '1px solid rgba(76,175,80,0.3)',
        boxShadow: '0 0 8px rgba(76,175,80,0.1)',
        cursor: 'default',
      }}
    >
      <VerifiedUserIcon
        sx={{
          fontSize: size === 'md' ? 14 : 12,
          color: '#4caf50',
          filter: 'drop-shadow(0 0 3px rgba(76,175,80,0.5))',
        }}
      />
      {size === 'md' && (
        <Typography
          sx={{
            fontFamily: '"Orbitron", monospace',
            fontSize: '0.55rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#4caf50',
            lineHeight: 1,
          }}
        >
          ID VERIFIED
        </Typography>
      )}
    </Box>
  );

  if (!tooltip) return badge;

  return (
    <Tooltip title="Identity verified — government ID confirmed" placement="top" arrow>
      {badge}
    </Tooltip>
  );
}
