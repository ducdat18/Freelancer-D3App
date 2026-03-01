import { Container, Typography, Box, Paper } from '@mui/material';
import Layout from '../src/components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h3" fontWeight={600} gutterBottom>
          Terms of Service
        </Typography>
        <Paper sx={{ p: 4, mt: 3 }}>
          <Typography variant="body1" color="text.secondary">
            This page is under construction. Terms of service for the FreelanceChain
            decentralized marketplace will be published here.
          </Typography>
          <Box sx={{ mt: 4, p: 3, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              As a decentralized application on Solana, interactions are governed by
              smart contract logic. All transactions are final and recorded on-chain.
              Users are responsible for their own wallet security and private keys.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}
