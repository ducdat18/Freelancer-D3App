import { useState, useEffect, useCallback } from 'react';

export interface FilterPreferences {
  skills: string[];
  categories: string[];
  budgetRange: { min: number; max: number };
  dateRange: { start: Date | null; end: Date | null };
  sortBy: string;
  searchTerm?: string;
}

const DEFAULT_PREFERENCES: FilterPreferences = {
  skills: [],
  categories: [],
  budgetRange: { min: 0, max: Infinity },
  dateRange: { start: null, end: null },
  sortBy: 'newest',
  searchTerm: ''
};

export function useFilterPreferences(key: string) {
  const [preferences, setPreferences] = useState<FilterPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem(`filter_prefs_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.dateRange) {
          parsed.dateRange = {
            start: parsed.dateRange.start ? new Date(parsed.dateRange.start) : null,
            end: parsed.dateRange.end ? new Date(parsed.dateRange.end) : null
          };
        }
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading filter preferences:', error);
    } finally {
      setLoaded(true);
    }
  }, [key]);

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: Partial<FilterPreferences>) => {
    const updatedPrefs = { ...preferences, ...prefs };
    setPreferences(updatedPrefs);

    try {
      localStorage.setItem(`filter_prefs_${key}`, JSON.stringify(updatedPrefs));
    } catch (error) {
      console.error('Error saving filter preferences:', error);
    }
  }, [key, preferences]);

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(`filter_prefs_${key}`);
    } catch (error) {
      console.error('Error resetting filter preferences:', error);
    }
  }, [key]);

  // Individual update functions
  const updateSkills = useCallback((skills: string[]) => {
    savePreferences({ skills });
  }, [savePreferences]);

  const updateCategories = useCallback((categories: string[]) => {
    savePreferences({ categories });
  }, [savePreferences]);

  const updateBudgetRange = useCallback((budgetRange: { min: number; max: number }) => {
    savePreferences({ budgetRange });
  }, [savePreferences]);

  const updateDateRange = useCallback((dateRange: { start: Date | null; end: Date | null }) => {
    savePreferences({ dateRange });
  }, [savePreferences]);

  const updateSortBy = useCallback((sortBy: string) => {
    savePreferences({ sortBy });
  }, [savePreferences]);

  const updateSearchTerm = useCallback((searchTerm: string) => {
    savePreferences({ searchTerm });
  }, [savePreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Check if filters are active (not default)
  const hasActiveFilters = useCallback(() => {
    return (
      preferences.skills.length > 0 ||
      preferences.categories.length > 0 ||
      preferences.budgetRange.min > 0 ||
      preferences.budgetRange.max < Infinity ||
      preferences.dateRange.start !== null ||
      preferences.dateRange.end !== null ||
      (preferences.searchTerm && preferences.searchTerm.length > 0)
    );
  }, [preferences]);

  return {
    preferences,
    loaded,
    savePreferences,
    resetPreferences,
    updateSkills,
    updateCategories,
    updateBudgetRange,
    updateDateRange,
    updateSortBy,
    updateSearchTerm,
    hasActiveFilters: hasActiveFilters()
  };
}
