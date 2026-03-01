import { Container, Typography, Box, Paper } from '@mui/material';
import Layout from '../src/components/Layout';

export default function PrivacyPage() {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h3" fontWeight={600} gutterBottom>
          Privacy Policy
        </Typography>
        <Paper sx={{ p: 4, mt: 3 }}>
          <Typography variant="body1" color="text.secondary">
            This page is under construction. The privacy policy for Lancer Lab
            will be published here.
          </Typography>
          <Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Lancer Lab is a decentralized application. On-chain data (job postings,
              bids, escrow transactions) is publicly visible on the Solana blockchain.
              Off-chain data (messages, profile details stored locally) remains on your device.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}
