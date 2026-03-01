import { useState } from 'react';
import { Box, Tabs, Tab, Grid, Typography } from '@mui/material';
import JobCard from '../JobCard';
import LoadingSpinner from '../LoadingSpinner';
import EmptyState from '../EmptyState';
import type { PublicKey } from '../../types/solana';

interface JobWithKey {
  publicKey: PublicKey;
  account: any;
}

interface TabConfig {
  label: string;
  jobs: JobWithKey[];
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyOnAction?: () => void;
}

interface DashboardJobTabsProps {
  tabs: TabConfig[];
  loading?: boolean;
}

const TAB_COLORS = ['#00ffc3', '#2196f3', '#4caf50', '#9945ff'];

export default function DashboardJobTabs({ tabs, loading }: DashboardJobTabsProps) {
  const [tabValue, setTabValue] = useState(0);
  const activeColor = TAB_COLORS[tabValue] ?? TAB_COLORS[0];

  return (
    <Box sx={{ border: '1px solid rgba(0,255,195,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      {/* Tab bar */}
      <Box sx={{ borderBottom: '1px solid rgba(0,255,195,0.08)', bgcolor: 'rgba(0,0,0,0.2)' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ style: { backgroundColor: activeColor, height: 2 } }}
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: 'text.secondary',
              '&.Mui-selected': { color: activeColor, fontWeight: 600 },
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={`${tab.label} (${tab.jobs.length})`} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 3 }}>
        {tabs.map((tab, index) =>
          tabValue === index && (
            <Box key={index}>
              <Typography
                variant="overline"
                sx={{ color: activeColor, letterSpacing: 3, fontSize: '0.6rem', display: 'block', mb: 2 }}
              >
                {tab.label.toUpperCase()}
              </Typography>
              {loading ? (
                <LoadingSpinner />
              ) : tab.jobs.length === 0 ? (
                <EmptyState
                  title={tab.emptyTitle}
                  description={tab.emptyDescription}
                  actionLabel={tab.emptyActionLabel}
                  onAction={tab.emptyOnAction}
                />
              ) : (
                <Grid container spacing={2}>
                  {tab.jobs.map((job) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={job.publicKey.toString()}>
                      <JobCard job={job} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )
        )}
      </Box>
    </Box>
  );
}
