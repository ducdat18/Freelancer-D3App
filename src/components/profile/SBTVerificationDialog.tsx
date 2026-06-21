import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  Box,
  Link,
  Chip,
  Rating,
  alpha,
  IconButton,
  useTheme
} from '@mui/material';
import {
  VerifiedUser,
  Close,
  OpenInNew,
  ContentCopy,
  Block
} from '@mui/icons-material';
import { BN } from '@coral-xyz/anchor';
import type { ReputationSBTData } from '../../hooks/useSBTReputation';
import type { PublicKey } from '../../types/solana';
import { deriveSBTPDA } from '../../utils/pda';

interface SBTVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  sbt: ReputationSBTData | null;
  userPubkey: PublicKey;
}

function formatSol(lamports: BN): string {
  const sol = lamports.toNumber() / 1_000_000_000;
  return `${sol.toFixed(4)} SOL`;
}

function formatTimestamp(timestamp: BN): string {
  const date = new Date(timestamp.toNumber() * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

function verificationHashToHex(hash: number[]): string {
  return hash.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function explorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem' }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: 0.75 }}>{children}</Box>
    </Box>
  );
}

function AddressField({ address, label }: { address: string; label?: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
        borderRadius: 1,
        px: 1.5,
        py: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="body2"
        fontFamily="monospace"
        sx={{
          wordBreak: 'break-all',
          flex: 1,
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {address}
      </Typography>
      <IconButton size="small" onClick={handleCopy} title="Copy address">
        <ContentCopy sx={{ fontSize: 14 }} />
      </IconButton>
      <IconButton
        size="small"
        component="a"
        href={explorerUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        title="View on Solana Explorer"
      >
        <OpenInNew sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}

export default function SBTVerificationDialog({
  open,
  onClose,
  sbt,
  userPubkey,
}: SBTVerificationDialogProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  if (!sbt) return null;

  const [sbtPda] = deriveSBTPDA(userPubkey, sbt.sbtIndex);
  const sbtAddress = sbtPda.toBase58();
  const hashHex = verificationHashToHex(sbt.verificationHash);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { backgroundImage: 'none' }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="span" fontWeight={700}>
            SBT Verification Details
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers={!isDark}>
        {/* Status indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            mb: 4,
            p: 2.5,
            borderRadius: 2,
            border: 1,
            bgcolor: sbt.revoked
              ? (isDark ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.error.main, 0.05))
              : (isDark ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.success.main, 0.05)),
            borderColor: sbt.revoked
              ? alpha(theme.palette.error.main, 0.3)
              : alpha(theme.palette.success.main, 0.3),
          }}
        >
          {sbt.revoked ? (
            <>
              <Block sx={{ color: theme.palette.error.main, fontSize: 32 }} />
              <Typography
                variant="h6"
                sx={{ color: theme.palette.error.main, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Revoked
              </Typography>
            </>
          ) : (
            <>
              <VerifiedUser sx={{ color: theme.palette.success.main, fontSize: 32 }} />
              <Typography
                variant="h6"
                sx={{ color: theme.palette.success.main, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}
              >
                Verified On-Chain
              </Typography>
            </>
          )}
        </Box>

        {/* Job title and rating */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            {sbt.jobTitle}
          </Typography>
          <Rating
            value={sbt.rating}
            readOnly
            size="large"
            max={5}
            precision={1}
            sx={{
              '& .MuiRating-iconFilled': {
                color: sbt.rating >= 4 ? theme.palette.success.main : theme.palette.warning.main,
              }
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 600 }}>
            {sbt.rating} out of 5 stars
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* SBT PDA Account */}
        <DataRow label="SBT Account (PDA)">
          <AddressField address={sbtAddress} />
        </DataRow>

        {/* Job address */}
        <DataRow label="Job Account">
          <AddressField address={sbt.job.toBase58()} />
        </DataRow>

        {/* Rater address */}
        <DataRow label="Rater (Client)">
          <AddressField address={sbt.rater.toBase58()} />
        </DataRow>

        {/* User address */}
        <DataRow label="User (Freelancer)">
          <AddressField address={sbt.user.toBase58()} />
        </DataRow>

        <Divider sx={{ my: 3 }} />

        {/* Comment */}
        {sbt.comment && (
          <DataRow label="Review Comment">
            <Typography
              variant="body2"
              sx={{
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
                borderRadius: 1,
                p: 2,
                fontStyle: 'italic',
                border: 1,
                borderColor: 'divider',
                lineHeight: 1.6,
                color: 'text.primary',
              }}
            >
              &ldquo;{sbt.comment}&rdquo;
            </Typography>
          </DataRow>
        )}

        {/* Job amount */}
        <DataRow label="Escrow Amount">
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {formatSol(sbt.jobAmount)}
          </Typography>
        </DataRow>

        {/* Issued at */}
        <DataRow label="Verification Date">
          <Typography variant="body2" fontWeight={600}>
            {formatTimestamp(sbt.issuedAt)}
          </Typography>
        </DataRow>

        {/* SBT Index */}
        <DataRow label="SBT Record ID">
          <Chip label={`#${sbt.sbtIndex}`} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
        </DataRow>

        <Divider sx={{ my: 3 }} />

        {/* Verification hash */}
        <DataRow label="On-Chain Hash">
          <Box
            sx={{
              bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50',
              borderRadius: 1,
              px: 1.5,
              py: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{
                wordBreak: 'break-all',
                flex: 1,
                fontSize: '0.75rem',
                lineHeight: 1.6,
                color: 'text.secondary',
              }}
            >
              0x{hashHex}
            </Typography>
            <IconButton
              size="small"
              onClick={() => navigator.clipboard.writeText(`0x${hashHex}`)}
              title="Copy hash"
            >
              <ContentCopy sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </DataRow>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, justifyContent: 'space-between', bgcolor: isDark ? 'transparent' : 'grey.50' }}>
        <Link
          href={explorerUrl(sbtAddress)}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: theme.palette.info.main,
          }}
        >
          <OpenInNew sx={{ fontSize: 16 }} />
          EXPLORER
        </Link>
        <Button onClick={onClose} variant="contained" sx={{ px: 4, fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
