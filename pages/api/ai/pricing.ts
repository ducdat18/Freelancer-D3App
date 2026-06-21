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
  const { aiRateLimit } = await import('../../../src/utils/rateLimit');
  if (!aiRateLimit(req, res)) return;

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

    // ── Heuristic pricing (used as fallback and as a sanity anchor) ──────────
    const base = complexityBaseRates[complexity];

    let skillMultiplier = 1.0;
    const matchedPremiums: number[] = [];
    for (const skill of skills) {
      const premium = skillPremiums[skill.toLowerCase()];
      if (premium) matchedPremiums.push(premium);
    }
    if (matchedPremiums.length > 0) {
      skillMultiplier = matchedPremiums.reduce((sum, p) => sum + p, 0) / matchedPremiums.length;
    }

    const timelineFactor = timelineDays <= 3 ? 1.5 : timelineDays <= 7 ? 1.25 : timelineDays <= 14 ? 1.1 : 1.0;
    const descLengthFactor = jobDescription.length > 500 ? 1.15 : jobDescription.length > 200 ? 1.05 : 1.0;

    const heuristic = {
      minPrice: parseFloat((base.min * skillMultiplier * timelineFactor * descLengthFactor).toFixed(2)),
      maxPrice: parseFloat((base.max * skillMultiplier * timelineFactor * descLengthFactor).toFixed(2)),
      marketAverage: parseFloat((base.avg * skillMultiplier * timelineFactor).toFixed(2)),
      recommendedPrice: 0,
      confidence: parseFloat((0.6 + (matchedPremiums.length / Math.max(skills.length, 1)) * 0.35).toFixed(2)),
    };
    heuristic.recommendedPrice = parseFloat(((heuristic.minPrice + heuristic.maxPrice) * 0.55).toFixed(2));

    // ── Real AI pricing via Groq, anchored to the heuristic range ────────────
    const { callGroqJSON, sanitize } = await import('../../../src/utils/aiHelpers');

    const ai = await callGroqJSON<{
      minPrice: number; maxPrice: number; recommendedPrice: number; marketAverage: number; confidence: number;
    }>(
      `You are a freelance pricing analyst for a Solana (SOL) marketplace. Estimate a fair price range in SOL.\n\n` +
      `JOB DESCRIPTION:\n"""${sanitize(jobDescription).slice(0, 1800)}"""\n` +
      `SKILLS: ${skills.join(', ') || 'unspecified'}\n` +
      `COMPLEXITY: ${complexity}\n` +
      `TIMELINE: ${timelineDays} days\n\n` +
      `A rule-based estimate for reference is ${heuristic.minPrice}-${heuristic.maxPrice} SOL ` +
      `(market avg ~${heuristic.marketAverage} SOL). Use it as a sanity anchor but adjust based on the actual scope, ` +
      `skill premiums (Rust/Solana/smart contracts command more), and timeline pressure.\n\n` +
      `Output ONLY this JSON (numbers in SOL):\n` +
      `{"minPrice": 0, "maxPrice": 0, "recommendedPrice": 0, "marketAverage": 0, "confidence": 0.0}`,
      { maxTokens: 300, temperature: 0.2 },
    );

    const valid = ai
      && [ai.minPrice, ai.maxPrice, ai.recommendedPrice, ai.marketAverage].every(n => typeof n === 'number' && n > 0)
      && ai.maxPrice >= ai.minPrice;

    if (valid) {
      const r2 = (n: number) => parseFloat(Number(n).toFixed(2));
      return res.status(200).json({
        minPrice: r2(ai!.minPrice),
        maxPrice: r2(ai!.maxPrice),
        recommendedPrice: r2(ai!.recommendedPrice),
        marketAverage: r2(ai!.marketAverage),
        confidence: parseFloat(Math.min(0.99, Math.max(0.5, ai!.confidence || 0.8)).toFixed(2)),
      });
    }

    return res.status(200).json(heuristic);
  } catch (error: any) {
    console.error('AI pricing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
