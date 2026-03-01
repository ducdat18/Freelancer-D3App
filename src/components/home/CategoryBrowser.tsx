import { Container, Typography, Box, Grid, Card, CardContent } from '@mui/material';
import {
  Code,
  PhoneIphone,
  Brush,
  Palette,
  Edit,
  Campaign,
  BarChart,
  Token,
  Videocam,
  MoreHoriz,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { JOB_CATEGORIES, CATEGORY_SKILLS, type JobCategory } from '../../config/categories';
import { staggerContainer, staggerChild } from '../../utils/animations';

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);

const CATEGORY_ICONS: Record<JobCategory, React.ElementType> = {
  'Web Development': Code,
  'Mobile Development': PhoneIphone,
  'UI/UX Design': Brush,
  'Graphic Design': Palette,
  'Content Writing': Edit,
  'Marketing': Campaign,
  'Data Science': BarChart,
  'Blockchain': Token,
  'Video & Animation': Videocam,
  'Other': MoreHoriz,
};

export default function CategoryBrowser() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" fontWeight={600} gutterBottom>
          Browse by Category
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find work in your area of expertise
        </Typography>
      </Box>

      <MotionBox
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.2 }}
      >
        <Grid container spacing={2}>
          {JOB_CATEGORIES.map((category) => {
            const IconComp = CATEGORY_ICONS[category];
            const skillCount = CATEGORY_SKILLS[category].length;
            return (
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={category}>
                <Link href={`/jobs?category=${encodeURIComponent(category)}`} style={{ textDecoration: 'none', display: 'block' }}>
                <MotionCard
                  variants={staggerChild}
                  sx={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: '0 0 20px rgba(0, 255, 195, 0.15)',
                    },
                  }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <CardContent sx={{ py: 3 }}>
                    <IconComp
                      sx={{
                        fontSize: 40,
                        color: 'primary.main',
                        mb: 1,
                        filter: 'drop-shadow(0 0 6px rgba(0, 255, 195, 0.3))',
                      }}
                    />
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {category}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {skillCount} skills
                    </Typography>
                  </CardContent>
                </MotionCard>
                </Link>
              </Grid>
            );
          })}
        </Grid>
      </MotionBox>
    </Container>
  );
}
