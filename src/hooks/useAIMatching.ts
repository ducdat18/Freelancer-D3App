import { useCallback, useState } from "react";

export interface MatchResult {
  freelancerAddress: string;
  compatibilityScore: number;
  matchedSkills: string[];
  completedJobs: number;
  averageRating: number;
  proposedRate: number;
}

export interface PricingSuggestion {
  minPrice: number;
  maxPrice: number;
  recommendedPrice: number;
  marketAverage: number;
  confidence: number;
}

export function useAIMatching() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMatches = useCallback(async (
    jobDescription: string,
    requiredSkills: string[],
    budget: number,
    limit: number = 10,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/ai/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, requiredSkills, budget, limit }),
      });
      if (!response.ok) throw new Error("Failed to fetch matches");
      const data = await response.json();
      setMatches(data.matches || []);
      return data.matches;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { matches, loading, error, findMatches };
}

export function useAIPricing() {
  const [suggestion, setSuggestion] = useState<PricingSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestion = useCallback(async (
    jobDescription: string,
    skills: string[],
    complexity: string,
    timelineDays: number,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/ai/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, skills, complexity, timelineDays }),
      });
      if (!response.ok) throw new Error("Failed to get pricing suggestion");
      const data = await response.json();
      setSuggestion(data.suggestion || null);
      return data.suggestion;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggestion, loading, error, getSuggestion };
}
