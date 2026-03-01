import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  TypographyProps
} from '@mui/material';
import { getTokenByMint, formatTokenAmount, TokenConfig, getDefaultToken } from '../../config/tokens';

interface TokenAmountProps {
  amount: number; // Amount in smallest unit (lamports/base units)
  mint?: string; // Token mint address (optional, defaults to SOL)
  token?: TokenConfig; // Or provide token directly
  showIcon?: boolean;
  showSymbol?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: TypographyProps['variant'];
  color?: TypographyProps['color'];
  decimals?: number; // Override decimals
  maxDecimals?: number; // Max decimal places to show
  showFullAmount?: boolean; // Show full amount in tooltip
}

export default function TokenAmount({
  amount,
  mint,
  token: providedToken,
  showIcon = true,
  showSymbol = true,
  size = 'medium',
  variant,
  color = 'text.primary',
  decimals,
  maxDecimals = 6,
  showFullAmount = true
}: TokenAmountProps) {
  // Get token config
  const token = providedToken || (mint ? getTokenByMint(mint) : null) || getDefaultToken();

  // Determine sizes
  const iconSize = size === 'small' ? 16 : size === 'large' ? 32 : 24;
  const textVariant = variant || (size === 'small' ? 'body2' : size === 'large' ? 'h6' : 'body1');

  // Format the amount
  const tokenDecimals = decimals !== undefined ? decimals : token.decimals;
  const formattedAmount = formatTokenAmount(amount, tokenDecimals, maxDecimals);

  // Calculate full amount for tooltip
  const fullAmount = amount / Math.pow(10, tokenDecimals);
  const fullAmountText = `${fullAmount.toFixed(tokenDecimals)} ${token.symbol}`;

  const content = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5
      }}
    >
      {showIcon && (
        <Avatar
          src={token.icon}
          alt={token.symbol}
          sx={{ width: iconSize, height: iconSize }}
        />
      )}
      <Typography
        variant={textVariant}
        color={color}
        component="span"
        sx={{ fontWeight: 500 }}
      >
        {formattedAmount}
        {showSymbol && (
          <Typography
            component="span"
            variant={textVariant}
            color="text.secondary"
            sx={{ ml: 0.5 }}
          >
            {token.symbol}
          </Typography>
        )}
      </Typography>
    </Box>
  );

  // Wrap in tooltip if showing full amount and amount is formatted
  if (showFullAmount && formattedAmount !== fullAmount.toString()) {
    return (
      <Tooltip title={fullAmountText} arrow>
        {content}
      </Tooltip>
    );
  }

  return content;
}

// Compact version for displaying in lists
export function CompactTokenAmount({
  amount,
  mint,
  token: providedToken
}: Pick<TokenAmountProps, 'amount' | 'mint' | 'token'>) {
  return (
    <TokenAmount
      amount={amount}
      mint={mint}
      token={providedToken}
      showIcon={true}
      showSymbol={true}
      size="small"
      maxDecimals={2}
    />
  );
}

// Large version for displaying in detail views
export function LargeTokenAmount({
  amount,
  mint,
  token: providedToken
}: Pick<TokenAmountProps, 'amount' | 'mint' | 'token'>) {
  return (
    <TokenAmount
      amount={amount}
      mint={mint}
      token={providedToken}
      showIcon={true}
      showSymbol={true}
      size="large"
      maxDecimals={4}
    />
  );
}
