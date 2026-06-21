import React, { useState } from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
  Rating,
  Chip,
  Avatar,
  alpha,
  useTheme
} from '@mui/material';
import {
  Shield,
  VerifiedUser,
  Block
} from '@mui/icons-material';
import { BN } from '@coral-xyz/anchor';
import type { ReputationSBTData } from '../../hooks/useSBTReputation';
import SBTVerificationDialog from './SBTVerificationDialog';
import type { PublicKey } from '../../types/solana';
import { formatSol as formatSolAmount } from '../../types/solana';

interface SBTBadgeProps {
  sbt: ReputationSBTData;
  userPubkey: PublicKey;
}

function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatSol(lamports: BN): string {
  const sol = lamports.toNumber() / 1_000_000_000;
  return `${formatSolAmount(sol)} SOL`;
}

function formatDate(timestamp: BN): string {
  const date = new Date(timestamp.toNumber() * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SBTBadge({ sbt, userPubkey }: SBTBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return theme.palette.success.main;
    if (rating >= 3) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const ratingColor = getRatingColor(sbt.rating);

  return (
    <>
      <Card
        sx={{
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.3s ease',
          opacity: sbt.revoked ? 0.6 : 1,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: isDark ? `0 0 20px ${ratingColor}20` : '0 8px 24px rgba(0,0,0,0.08)',
            borderColor: ratingColor,
          },
          border: 1,
          borderColor: sbt.revoked
            ? theme.palette.error.main
            : alpha(ratingColor, 0.3),
          background: isDark
            ? `linear-gradient(135deg, ${alpha(ratingColor, 0.08)} 0%, ${alpha(ratingColor, 0.02)} 100%)`
            : `linear-gradient(135deg, ${alpha(ratingColor, 0.05)} 0%, ${alpha(ratingColor, 0.01)} 100%)`,
          backgroundImage: 'none',
        }}
      >
        {/* Revoked overlay */}
        {sbt.revoked && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.error.main, 0.08),
              zIndex: 2,
              borderRadius: 'inherit',
              pointerEvents: 'none',
            }}
          >
            <Chip
              icon={<Block />}
              label="REVOKED"
              color="error"
              sx={{
                fontWeight: 800,
                fontSize: '0.9rem',
                py: 2,
                px: 1,
                transform: 'rotate(-12deg)',
                fontFamily: '"Orbitron", sans-serif',
              }}
            />
          </Box>
        )}

        <CardActionArea onClick={() => setDialogOpen(true)}>
          <CardContent sx={{ p: 2.5 }}>
            {/* Shield icon and rating row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: alpha(ratingColor, 0.1),
                  color: ratingColor,
                  width: 48,
                  height: 48,
                  border: 1,
                  borderColor: alpha(ratingColor, 0.2),
                }}
              >
                <Shield sx={{ fontSize: 28 }} />
              </Avatar>
              <Rating
                value={sbt.rating}
                readOnly
                size="small"
                max={5}
                precision={1}
                sx={{
                  '& .MuiRating-iconFilled': {
                    color: ratingColor,
                  }
                }}
              />
            </Box>

            {/* Job title */}
            <Typography
              variant="subtitle1"
              fontWeight={700}
              gutterBottom
              noWrap
              sx={{ lineHeight: 1.3 }}
            >
              {sbt.jobTitle}
            </Typography>

            {/* Rater address */}
            <Typography
              variant="body2"
              color="text.secondary"
              gutterBottom
              sx={{ fontWeight: 500 }}
            >
              Rated by{' '}
              <Typography
                component="span"
                variant="body2"
                fontFamily="monospace"
                sx={{ fontWeight: 700, color: 'text.primary' }}
              >
                {truncateAddress(sbt.rater.toBase58())}
              </Typography>
            </Typography>

            {/* Amount and date row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 2,
                mb: 1,
              }}
            >
              <Chip
                label={formatSol(sbt.jobAmount)}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 22, borderColor: 'divider' }}
              />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {formatDate(sbt.issuedAt)}
              </Typography>
            </Box>

            {/* Verified on-chain indicator */}
            {!sbt.revoked && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mt: 1.5,
                }}
              >
                <VerifiedUser sx={{ fontSize: 14, color: theme.palette.success.main }} />
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.success.main, fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Verified on-chain
                </Typography>
              </Box>
            )}
          </CardContent>
        </CardActionArea>
      </Card>

      {/* Verification dialog */}
      <SBTVerificationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        sbt={sbt}
        userPubkey={userPubkey}
      />
    </>
  );
}
