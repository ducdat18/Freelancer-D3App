import type { NextApiRequest, NextApiResponse } from 'next';

interface PricingRequest {
  jobDescription: string;
  skills: string[];
  complexity: 'low' | 'medium' | 'high' | 'expert';
  timelineDays: number;
}

interface PricingSuggestion {
  minPrice: number;
  maxPrice: number;
  recommendedPrice: number;
  marketAverage: number;
  confidence: number;
}

interface ErrorResponse {
  error: string;
}

// Base rates per complexity level (in SOL)
const complexityBaseRates: Record<string, { min: number; max: number; avg: number }> = {
  low: { min: 0.5, max: 3, avg: 1.5 },
  medium: { min: 2, max: 10, avg: 5 },
  high: { min: 8, max: 30, avg: 15 },
  expert: { min: 20, max: 100, avg: 50 },
};

// Skill premium multipliers
const skillPremiums: Record<string, number> = {
  rust: 1.4,
  solana: 1.35,
  'smart contracts': 1.3,
  anchor: 1.3,
  'machine learning': 1.25,
  'data science': 1.2,
  react: 1.1,
  typescript: 1.1,
  'node.js': 1.05,
  python: 1.05,
  graphql: 1.1,
  web3: 1.2,
  solidity: 1.25,
  'ui/ux design': 1.1,
  docker: 1.05,
  aws: 1.1,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PricingSuggestion | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobDescription, skills, complexity, timelineDays }: PricingRequest = req.body;

    if (!jobDescription || !skills || !Array.isArray(skills)) {
      return res.status(400).json({ error: 'Missing required fields: jobDescription, skills (array)' });
    }

    if (!complexity || !complexityBaseRates[complexity]) {
      return res.status(400).json({ error: 'Invalid complexity. Must be one of: low, medium, high, expert' });
    }

    if (typeof timelineDays !== 'number' || timelineDays <= 0) {
      return res.status(400).json({ error: 'timelineDays must be a positive number.' });
    }

    // TODO: Replace with actual AI pricing model integration
    // Currently calculates mock pricing based on complexity, skills, and timeline
    const base = complexityBaseRates[complexity];

    // Calculate skill premium (average of all skill multipliers)
    let skillMultiplier = 1.0;
    const matchedPremiums: number[] = [];
    for (const skill of skills) {
      const premium = skillPremiums[skill.toLowerCase()];
      if (premium) {
        matchedPremiums.push(premium);
      }
    }
    if (matchedPremiums.length > 0) {
      skillMultiplier = matchedPremiums.reduce((sum, p) => sum + p, 0) / matchedPremiums.length;
    }

    // Timeline factor (tighter deadlines cost more)
    const timelineFactor = timelineDays <= 3
      ? 1.5
      : timelineDays <= 7
        ? 1.25
        : timelineDays <= 14
          ? 1.1
          : 1.0;

    // Description length factor (longer descriptions often mean more complex work)
    const descLengthFactor = jobDescription.length > 500 ? 1.15 : jobDescription.length > 200 ? 1.05 : 1.0;

    const minPrice = parseFloat((base.min * skillMultiplier * timelineFactor * descLengthFactor).toFixed(2));
    const maxPrice = parseFloat((base.max * skillMultiplier * timelineFactor * descLengthFactor).toFixed(2));
    const marketAverage = parseFloat((base.avg * skillMultiplier * timelineFactor).toFixed(2));
    const recommendedPrice = parseFloat(((minPrice + maxPrice) * 0.55).toFixed(2));

    // Confidence based on how many skills we have data for
    const knownSkillRatio = matchedPremiums.length / Math.max(skills.length, 1);
    const confidence = parseFloat((0.6 + knownSkillRatio * 0.35).toFixed(2));

    return res.status(200).json({
      minPrice,
      maxPrice,
      recommendedPrice,
      marketAverage,
      confidence,
    });
  } catch (error: any) {
    console.error('AI pricing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
