import { Container, Typography, Box } from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useWallet } from '@solana/wallet-adapter-react';
import EmptyState from '../../src/components/EmptyState';
import BalanceHistory from '../../src/components/wallet/BalanceHistory';

export default function WalletPage() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <EmptyState
          title="Wallet Not Connected"
          description="Connect your Solana wallet to view your balance and transaction history."
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <AccountBalanceWallet sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>Wallet</Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Your live SOL balance and a reconstructed history of every balance change on-chain.
        </Typography>
      </Box>

      <BalanceHistory />
    </Container>
  );
}
