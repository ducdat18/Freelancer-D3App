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
  alpha
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
  return `${sol.toFixed(2)} SOL`;
}

function formatDate(timestamp: BN): string {
  const date = new Date(timestamp.toNumber() * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return '#00ffc3';
  if (rating >= 3) return '#e04d01';
  return '#ff00ff';
}

export default function SBTBadge({ sbt, userPubkey }: SBTBadgeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

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
            boxShadow: 6,
          },
          border: sbt.revoked
            ? '2px solid #ff00ff'
            : `2px solid ${alpha(ratingColor, 0.4)}`,
          background: sbt.revoked
            ? undefined
            : `linear-gradient(135deg, ${alpha(ratingColor, 0.08)} 0%, ${alpha(ratingColor, 0.02)} 100%)`,
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
              bgcolor: alpha('#ff00ff', 0.08),
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
                fontWeight: 'bold',
                fontSize: '0.9rem',
                py: 2,
                px: 1,
                transform: 'rotate(-12deg)',
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
                  bgcolor: alpha(ratingColor, 0.15),
                  color: ratingColor,
                  width: 48,
                  height: 48,
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
              />
            </Box>

            {/* Job title */}
            <Typography
              variant="subtitle1"
              fontWeight="bold"
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
            >
              Rated by{' '}
              <Typography
                component="span"
                variant="body2"
                fontFamily="monospace"
                sx={{ fontWeight: 500 }}
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
                mt: 1.5,
                mb: 1,
              }}
            >
              <Chip
                label={formatSol(sbt.jobAmount)}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              <Typography variant="caption" color="text.secondary">
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
                <VerifiedUser sx={{ fontSize: 16, color: '#00ffc3' }} />
                <Typography
                  variant="caption"
                  sx={{ color: '#00ffc3', fontWeight: 500 }}
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
