import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Stack,
} from '@mui/material';
import { Star, Work, ArrowForward } from '@mui/icons-material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTopFreelancersQuery } from '../../hooks/queries/useFreelancersQuery';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

export default function TopFreelancers() {
  const { data: freelancers, isLoading } = useTopFreelancersQuery(6);

  if (isLoading || !freelancers || freelancers.length === 0) return null;

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" fontWeight={600} gutterBottom>
            Top Freelancers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Highest-rated talent on the platform
          </Typography>
        </Box>
        <Button
          component={Link}
          href="/freelancers"
          endIcon={<ArrowForward />}
          sx={{ display: { xs: 'none', md: 'flex' } }}
        >
          Find Talent
        </Button>
      </Box>

      <MotionBox
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
      >
        <Grid container spacing={3}>
          {freelancers.map((freelancer) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={freelancer.address}>
              <MotionCard
                variants={staggerChild}
                sx={{ height: '100%' }}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: 'primary.main',
                        color: 'background.default',
                        fontFamily: '"Orbitron", sans-serif',
                        fontWeight: 700,
                        mr: 2,
                      }}
                    >
                      {freelancer.address.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {freelancer.address.slice(0, 6)}...{freelancer.address.slice(-4)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                        <Typography variant="body2" fontWeight={600}>
                          {freelancer.averageRating.toFixed(1)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({freelancer.totalReviews})
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      icon={<Work />}
                      label={`${freelancer.completedJobs} jobs`}
                      size="small"
                      variant="outlined"
                    />
                    {freelancer.averageRating >= 4.5 && (
                      <Chip label="Top Rated" size="small" color="success" />
                    )}
                  </Stack>

                  <Button
                    component={Link}
                    href={`/profile/${freelancer.address}`}
                    variant="outlined"
                    size="small"
                    fullWidth
                  >
                    View Profile
                  </Button>
                </CardContent>
              </MotionCard>
            </Grid>
          ))}
        </Grid>
      </MotionBox>

      <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mt: 3 }}>
        <Button component={Link} href="/freelancers" endIcon={<ArrowForward />}>
          Find Talent
        </Button>
      </Box>
    </Container>
  );
}
