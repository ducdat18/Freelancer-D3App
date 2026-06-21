import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Chip,
  Popover,
  Typography,
  IconButton,
  useTheme
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CalendarToday, Clear } from '@mui/icons-material';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (range: { start: Date | null; end: Date | null }) => void;
}

interface Preset {
  label: string;
  days: number;
}

const PRESETS: Preset[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: 0 }
];

export default function DateRangeFilter({
  startDate,
  endDate,
  onChange
}: DateRangeFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePreset = (days: number) => {
    if (days === 0) {
      // All time
      onChange({ start: null, end: null });
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      onChange({ start, end });
    }
    handleClose();
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange({ start: null, end: null });
  };

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'All time';

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }

    if (startDate) {
      return `From ${formatDate(startDate)}`;
    }

    return `Until ${formatDate(endDate!)}`;
  };

  const hasDateRange = startDate !== null || endDate !== null;
  const open = Boolean(anchorEl);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Button
          variant="outlined"
          onClick={handleClick}
          startIcon={<CalendarToday />}
          endIcon={
            hasDateRange ? (
              <IconButton size="small" onClick={handleClear} sx={{ p: 0.5, mr: -1 }}>
                <Clear sx={{ fontSize: 16 }} />
              </IconButton>
            ) : undefined
          }
          sx={{ 
            minWidth: 200,
            fontWeight: 600,
            borderColor: hasDateRange ? 'primary.main' : 'divider',
            color: hasDateRange ? 'primary.main' : 'text.primary',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: isDark ? 'rgba(0,255,195,0.05)' : 'rgba(5,150,105,0.05)',
            }
          }}
        >
          {formatDateRange()}
        </Button>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          PaperProps={{
            sx: { mt: 1, border: 1, borderColor: 'divider', boxShadow: isDark ? 10 : 4, backgroundImage: 'none' }
          }}
        >
          <Box sx={{ p: 3, minWidth: { xs: '100vw', sm: 400 } }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={700} sx={{ mb: 1.5 }}>
              Quick Select
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 4 }}>
              {PRESETS.map((preset) => {
                const active = preset.days === 0 ? !hasDateRange : false; // simplistic check
                return (
                  <Chip
                    key={preset.label}
                    label={preset.label}
                    onClick={() => handlePreset(preset.days)}
                    variant={active ? 'filled' : 'outlined'}
                    color={active ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                  />
                );
              })}
            </Stack>

            <Typography variant="subtitle2" gutterBottom fontWeight={700} sx={{ mb: 1.5 }}>
              Custom Range
            </Typography>
            <Stack spacing={2.5}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => onChange({ start: newValue, end: endDate })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                  }
                }}
                maxDate={endDate || undefined}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => onChange({ start: startDate, end: newValue })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small'
                  }
                }}
                minDate={startDate || undefined}
                maxDate={new Date()}
              />
            </Stack>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button size="small" onClick={() => { onChange({ start: null, end: null }); handleClose(); }} sx={{ fontWeight: 600 }}>
                Reset
              </Button>
              <Button size="small" variant="contained" onClick={handleClose} sx={{ fontWeight: 700, px: 3 }}>
                Apply
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
}
