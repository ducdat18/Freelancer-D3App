import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Avatar,
  ListItemAvatar,
  ListItemText,
  Chip
} from '@mui/material';
import { SUPPORTED_TOKENS, TokenConfig, formatTokenAmount } from '../../config/tokens';
import { useMultipleTokenBalances } from '../../hooks/useTokenBalance';

interface TokenSelectorProps {
  selectedToken: TokenConfig;
  onTokenChange: (token: TokenConfig) => void;
  requiredAmount?: number; // Amount needed in human-readable format
  disabled?: boolean;
}

export default function TokenSelector({
  selectedToken,
  onTokenChange,
  requiredAmount,
  disabled = false
}: TokenSelectorProps) {
  const { balances, loading } = useMultipleTokenBalances(SUPPORTED_TOKENS);

  const handleChange = (event: any) => {
    const symbol = event.target.value;
    const token = SUPPORTED_TOKENS.find(t => t.symbol === symbol);
    if (token) {
      onTokenChange(token);
    }
  };

  const hasInsufficientBalance = (token: TokenConfig): boolean => {
    if (!requiredAmount) return false;
    const balance = balances[token.symbol] || 0;
    return balance < requiredAmount;
  };

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel id="token-selector-label">Payment Token</InputLabel>
      <Select
        labelId="token-selector-label"
        value={selectedToken.symbol}
        onChange={handleChange}
        label="Payment Token"
        renderValue={(value) => {
          const token = SUPPORTED_TOKENS.find(t => t.symbol === value);
          if (!token) return value;

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                src={token.icon}
                alt={token.symbol}
                sx={{ width: 24, height: 24 }}
              />
              <Typography>{token.symbol}</Typography>
              {!loading && balances[token.symbol] !== undefined && (
                <Typography variant="body2" color="text.secondary">
                  ({balances[token.symbol].toFixed(4)} available)
                </Typography>
              )}
            </Box>
          );
        }}
      >
        {SUPPORTED_TOKENS.map((token) => {
          const balance = balances[token.symbol] || 0;
          const insufficient = hasInsufficientBalance(token);

          return (
            <MenuItem
              key={token.symbol}
              value={token.symbol}
              disabled={insufficient}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={token.icon}
                    alt={token.symbol}
                    sx={{ width: 32, height: 32 }}
                  />
                  <Box>
                    <Typography variant="body1">{token.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {token.name}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  {loading ? (
                    <Typography variant="body2" color="text.secondary">
                      Loading...
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2">
                        {balance.toFixed(4)} {token.symbol}
                      </Typography>
                      {insufficient && (
                        <Chip
                          label="Insufficient"
                          size="small"
                          color="error"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </>
                  )}
                </Box>
              </Box>
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
}
