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
  IconButton
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
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

function AddressField({ address, label }: { address: string; label?: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        bgcolor: 'action.hover',
        borderRadius: 1,
        px: 1.5,
        py: 0.75,
      }}
    >
      <Typography
        variant="body2"
        fontFamily="monospace"
        sx={{
          wordBreak: 'break-all',
          flex: 1,
          fontSize: '0.8rem',
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
  if (!sbt) return null;

  const [sbtPda] = deriveSBTPDA(userPubkey, sbt.sbtIndex);
  const sbtAddress = sbtPda.toBase58();
  const hashHex = verificationHashToHex(sbt.verificationHash);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="span" fontWeight="bold">
            SBT Verification Details
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Status indicator */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mb: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: sbt.revoked
              ? alpha('#f44336', 0.08)
              : alpha('#4caf50', 0.08),
          }}
        >
          {sbt.revoked ? (
            <>
              <Block sx={{ color: '#f44336', fontSize: 28 }} />
              <Typography
                variant="h6"
                sx={{ color: '#f44336', fontWeight: 'bold' }}
              >
                Revoked
              </Typography>
            </>
          ) : (
            <>
              <VerifiedUser sx={{ color: '#4caf50', fontSize: 28 }} />
              <Typography
                variant="h6"
                sx={{ color: '#4caf50', fontWeight: 'bold' }}
              >
                Verified On-Chain
              </Typography>
            </>
          )}
        </Box>

        {/* Job title and rating */}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {sbt.jobTitle}
          </Typography>
          <Rating
            value={sbt.rating}
            readOnly
            size="large"
            max={5}
            precision={1}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {sbt.rating} out of 5 stars
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* SBT PDA Account */}
        <DataRow label="SBT Account (PDA)">
          <AddressField address={sbtAddress} />
        </DataRow>

        {/* Job address */}
        <DataRow label="Job Address">
          <AddressField address={sbt.job.toBase58()} />
        </DataRow>

        {/* Rater address */}
        <DataRow label="Rater Address">
          <AddressField address={sbt.rater.toBase58()} />
        </DataRow>

        {/* User address */}
        <DataRow label="User Address">
          <AddressField address={sbt.user.toBase58()} />
        </DataRow>

        <Divider sx={{ my: 2 }} />

        {/* Comment */}
        {sbt.comment && (
          <DataRow label="Comment">
            <Typography
              variant="body2"
              sx={{
                bgcolor: 'action.hover',
                borderRadius: 1,
                p: 1.5,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{sbt.comment}&rdquo;
            </Typography>
          </DataRow>
        )}

        {/* Job amount */}
        <DataRow label="Job Amount">
          <Typography variant="body1" fontWeight="bold">
            {formatSol(sbt.jobAmount)}
          </Typography>
        </DataRow>

        {/* Issued at */}
        <DataRow label="Issued At">
          <Typography variant="body2">
            {formatTimestamp(sbt.issuedAt)}
          </Typography>
        </DataRow>

        {/* SBT Index */}
        <DataRow label="SBT Index">
          <Chip label={`#${sbt.sbtIndex}`} size="small" variant="outlined" />
        </DataRow>

        <Divider sx={{ my: 2 }} />

        {/* Verification hash */}
        <DataRow label="Verification Hash">
          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              px: 1.5,
              py: 1,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
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

        {/* Metadata URI */}
        {sbt.metadataUri && (
          <DataRow label="Metadata URI">
            <Typography
              variant="body2"
              fontFamily="monospace"
              sx={{
                wordBreak: 'break-all',
                fontSize: '0.8rem',
                bgcolor: 'action.hover',
                borderRadius: 1,
                px: 1.5,
                py: 0.75,
              }}
            >
              {sbt.metadataUri}
            </Typography>
          </DataRow>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Link
          href={explorerUrl(sbtAddress)}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.875rem',
          }}
        >
          <OpenInNew sx={{ fontSize: 16 }} />
          View on Solana Explorer
        </Link>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
