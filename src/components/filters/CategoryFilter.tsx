import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  OutlinedInput,
  SelectChangeEvent
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
              <Chip key={value} label={value} size="small" />
            ))}
          </Box>
        )}
      >
        {JOB_CATEGORIES.map((category) => (
          <MenuItem key={category} value={category}>
            {category}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
