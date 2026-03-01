import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import LoadingSpinner from '../LoadingSpinner';
import { Shield } from '@mui/icons-material';
import { useSBTReputation } from '../../hooks/useSBTReputation';
import type { ReputationSBTData } from '../../hooks/useSBTReputation';
import type { PublicKey } from '../../types/solana';
import SBTBadge from './SBTBadge';

interface SBTGalleryProps {
  userPubkey: PublicKey;
}

export default function SBTGallery({ userPubkey }: SBTGalleryProps) {
  const { fetchAllUserSBTs } = useSBTReputation();
  const [sbts, setSbts] = useState<ReputationSBTData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSBTs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userSBTs = await fetchAllUserSBTs(userPubkey);
      setSbts(userSBTs);
    } catch (err) {
      console.error('Failed to fetch SBTs:', err);
      setError('Failed to load reputation records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fetchAllUserSBTs, userPubkey]);

  useEffect(() => {
    loadSBTs();
  }, [loadSBTs]);

  // Loading state
  if (loading) {
    return (
      <LoadingSpinner
        message="Loading reputation records..."
        logs={[
          { text: 'PDA: SBT_COUNTER seed=[sbt-counter, wallet]', type: 'info' },
          { text: 'gPA filter: ReputationSBT[owner = signer]', type: 'info' },
          { text: 'Resolving Metaplex metadata URIs...', type: 'info' },
          { text: 'SBT records loaded', type: 'ok' },
        ]}
        sx={{ mt: 2 }}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Empty state
  if (sbts.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 250,
          textAlign: 'center',
          gap: 2,
        }}
      >
        <Shield sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.4 }} />
        <Typography variant="h6" color="text.secondary">
          No verified reputation records yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
          Soulbound Tokens are minted when jobs are completed and reviewed.
          They serve as permanent, on-chain proof of work history.
        </Typography>
      </Box>
    );
  }

  // SBT grid
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          Reputation SBTs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {sbts.length} verified record{sbts.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {sbts.map((sbt, index) => (
          <Grid
            key={`sbt-${sbt.sbtIndex}-${index}`}
            size={{ xs: 12, sm: 6, md: 4 }}
          >
            <SBTBadge sbt={sbt} userPubkey={userPubkey} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
