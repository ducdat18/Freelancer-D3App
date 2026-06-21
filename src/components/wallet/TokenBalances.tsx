import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { SUPPORTED_TOKENS } from '../../config/tokens';
import { useMultipleTokenBalances } from '../../hooks/useTokenBalance';

interface TokenBalancesProps {
  compact?: boolean;
}

export default function TokenBalances({ compact = false }: TokenBalancesProps) {
  const { balances, loading, error, refetch } = useMultipleTokenBalances(SUPPORTED_TOKENS);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, fontWeight: 500 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {!compact && (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2.5,
              pb: 1.5
            }}
          >
            <Typography variant="subtitle1" fontWeight={800} sx={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: 0.5 }}>
              ASSETS
            </Typography>
            <IconButton 
              size="small" 
              onClick={refetch} 
              disabled={loading}
              sx={{ 
                color: 'primary.main',
                bgcolor: isDark ? 'rgba(0,255,195,0.05)' : 'rgba(5,150,105,0.05)',
                '&:hover': { bgcolor: isDark ? 'rgba(0,255,195,0.1)' : 'rgba(5,150,105,0.1)' }
              }}
            >
              {loading ? <CircularProgress size={18} color="inherit" /> : <Refresh sx={{ fontSize: 18 }} />}
            </IconButton>
          </Box>
          <Divider sx={{ mx: 2 }} />
        </>
      )}

      <List dense={compact} sx={{ py: 1 }}>
        {SUPPORTED_TOKENS.map((token, index) => {
          const balance = balances[token.symbol] || 0;

          return (
            <React.Fragment key={token.symbol}>
              {index > 0 && compact && <Divider sx={{ opacity: 0.5 }} />}
              <ListItem 
                sx={{ 
                  py: compact ? 1 : 1.5,
                  px: 2.5,
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  },
                  borderRadius: 1,
                  mx: 0.5,
                  width: 'auto'
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    src={token.icon} 
                    alt={token.symbol} 
                    sx={{ 
                      width: compact ? 28 : 36, 
                      height: compact ? 28 : 36,
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper'
                    }} 
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={700} sx={{ letterSpacing: 0.2 }}>
                        {token.symbol}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        fontWeight={800} 
                        color={balance > 0 ? 'primary.main' : 'text.primary'}
                        sx={{ fontFamily: '"Orbitron", monospace' }}
                      >
                        {loading ? (
                          <CircularProgress size={12} thickness={6} />
                        ) : (
                          balance.toFixed(token.decimals === 9 ? 4 : 2)
                        )}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    !compact && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {token.name}
                        </Typography>
                        {balance > 0 && (
                          <Typography variant="caption" color="text.disabled" fontWeight={700}>
                            ≈ ${(balance * 1).toFixed(2)}
                          </Typography>
                        )}
                      </Box>
                    )
                  }
                />
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>

      {!compact && SUPPORTED_TOKENS.length > 0 && (
        <Box sx={{ p: 2, pt: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', fontWeight: 500 }}>
            * Estimated market values shown
          </Typography>
        </Box>
      )}
    </Box>
  );
}
