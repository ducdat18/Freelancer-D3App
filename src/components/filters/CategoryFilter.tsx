import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  OutlinedInput,
  SelectChangeEvent,
  useTheme
} from '@mui/material';
import { JOB_CATEGORIES, JobCategory } from '../../config/categories';

interface CategoryFilterProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  multiple?: boolean;
}

export default function CategoryFilter({
  selectedCategories,
  onChange,
  multiple = true
}: CategoryFilterProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onChange(typeof value === 'string' ? value.split(',') : value);
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="category-filter-label">Categories</InputLabel>
      <Select
        labelId="category-filter-label"
        multiple={multiple}
        value={selectedCategories}
        onChange={handleChange}
        input={<OutlinedInput label="Categories" />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip 
                key={value} 
                label={value} 
                size="small" 
                variant={isDark ? "outlined" : "filled"}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  bgcolor: isDark ? 'transparent' : 'rgba(5,150,105,0.08)',
                  color: isDark ? 'primary.main' : 'primary.dark',
                  borderColor: isDark ? 'primary.main' : 'transparent',
                }}
              />
            ))}
          </Box>
        )}
      >
        {JOB_CATEGORIES.map((category) => (
          <MenuItem 
            key={category} 
            value={category}
            sx={{
              fontWeight: selectedCategories.includes(category) ? 700 : 500,
              fontSize: '0.875rem'
            }}
          >
            {category}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
