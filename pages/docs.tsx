import { Container, Typography, Box, Paper, Grid, Card, CardContent, Button } from '@mui/material';
import { MenuBook, Code, AccountBalanceWallet, Gavel } from '@mui/icons-material';
import Link from 'next/link';
import Layout from '../src/components/Layout';

const sections = [
  {
    icon: AccountBalanceWallet,
    title: 'Getting Started',
    description: 'Connect your Solana wallet and start using the platform.',
    link: '/how-it-works',
  },
  {
    icon: Code,
    title: 'For Developers',
    description: 'Smart contract architecture, Anchor IDL, and integration guides.',
    link: '/how-it-works',
  },
  {
    icon: MenuBook,
    title: 'User Guide',
    description: 'How to post jobs, submit bids, manage escrow, and resolve disputes.',
    link: '/how-it-works',
  },
  {
    icon: Gavel,
    title: 'Governance',
    description: 'DAO proposals, voting, staking, and platform governance.',
    link: '/governance',
  },
];

export default function DocsPage() {
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h3" fontWeight={600} gutterBottom>
          Documentation
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Learn how to use Lancer Lab - the decentralized freelance marketplace on Solana.
        </Typography>

        <Grid container spacing={3}>
          {sections.map((section) => (
            <Grid size={{ xs: 12, sm: 6 }} key={section.title}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <section.icon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {section.description}
                  </Typography>
                  <Button component={Link} href={section.link} variant="outlined" size="small">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Layout>
  );
}
