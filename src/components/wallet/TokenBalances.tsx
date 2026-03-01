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
  Alert
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { SUPPORTED_TOKENS } from '../../config/tokens';
import { useMultipleTokenBalances } from '../../hooks/useTokenBalance';

interface TokenBalancesProps {
  compact?: boolean;
}

export default function TokenBalances({ compact = false }: TokenBalancesProps) {
  const { balances, loading, error, refetch } = useMultipleTokenBalances(SUPPORTED_TOKENS);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
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
              p: 2,
              pb: 1
            }}
          >
            <Typography variant="h6">Token Balances</Typography>
            <IconButton size="small" onClick={refetch} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <Refresh />}
            </IconButton>
          </Box>
          <Divider />
        </>
      )}

      <List dense={compact}>
        {SUPPORTED_TOKENS.map((token, index) => {
          const balance = balances[token.symbol] || 0;

          return (
            <React.Fragment key={token.symbol}>
              {index > 0 && compact && <Divider />}
              <ListItem>
                <ListItemAvatar>
                  <Avatar src={token.icon} alt={token.symbol} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1" fontWeight={500}>
                        {token.symbol}
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {loading ? '...' : balance.toFixed(token.decimals === 9 ? 4 : 2)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    !compact && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {token.name}
                        </Typography>
                        {balance > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            ≈ ${(balance * 1).toFixed(2)} {/* Placeholder for USD value */}
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
        <Box sx={{ p: 2, pt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Prices are estimated. Refresh for latest balances.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
