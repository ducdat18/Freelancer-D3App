import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

interface VerifiedBadgeProps {
  /** 'sm' = icon only (for cards), 'md' = icon + label (for profiles) */
  size?: 'sm' | 'md';
  tooltip?: boolean;
}

export default function VerifiedBadge({ size = 'md', tooltip = true }: VerifiedBadgeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const successColor = theme.palette.success.main;

  const badge = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: size === 'md' ? 1 : 0.5,
        py: size === 'md' ? 0.3 : 0.25,
        borderRadius: 1,
        bgcolor: isDark ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.05)',
        border: 1,
        borderColor: isDark ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.4)',
        boxShadow: isDark ? '0 0 8px rgba(76,175,80,0.1)' : 'none',
        cursor: 'default',
      }}
    >
      <VerifiedUserIcon
        sx={{
          fontSize: size === 'md' ? 14 : 12,
          color: successColor,
          filter: isDark ? 'drop-shadow(0 0 3px rgba(76,175,80,0.5))' : 'none',
        }}
      />
      {size === 'md' && (
        <Typography
          sx={{
            fontFamily: '"Orbitron", monospace',
            fontSize: '0.55rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: successColor,
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
