import React, { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  Chip,
  Popover,
  Typography,
  IconButton
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
              <IconButton size="small" onClick={handleClear}>
                <Clear fontSize="small" />
              </IconButton>
            ) : undefined
          }
          sx={{ minWidth: 200 }}
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
        >
          <Box sx={{ p: 3, minWidth: 400 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Select
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              {PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  onClick={() => handlePreset(preset.days)}
                  variant={
                    preset.days === 0 && !hasDateRange
                      ? 'filled'
                      : 'outlined'
                  }
                  color={
                    preset.days === 0 && !hasDateRange
                      ? 'primary'
                      : 'default'
                  }
                />
              ))}
            </Stack>

            <Typography variant="subtitle2" gutterBottom>
              Custom Range
            </Typography>
            <Stack spacing={2}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => onChange({ start: newValue, end: endDate })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small'
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

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button size="small" onClick={() => onChange({ start: null, end: null })}>
                Clear
              </Button>
              <Button size="small" variant="contained" onClick={handleClose}>
                Apply
              </Button>
            </Box>
          </Box>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
}
