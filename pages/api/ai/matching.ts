import type { NextApiRequest, NextApiResponse } from 'next';

interface MatchResult {
  freelancerAddress: string;
  compatibilityScore: number;
  matchedSkills: string[];
}

interface MatchingRequest {
  jobDescription: string;
  requiredSkills: string[];
  budget: number;
  limit?: number;
}

interface MatchingResponse {
  results: MatchResult[];
  total: number;
  processingTime: number;
}

interface ErrorResponse {
  error: string;
}

// Mock freelancer pool for generating results
const mockFreelancers = [
  { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', skills: ['React', 'TypeScript', 'Node.js', 'Solana', 'Rust'] },
  { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', skills: ['Python', 'Machine Learning', 'Data Science', 'TypeScript'] },
  { address: '3Hk5YmKbcHCFBjfRSqeP8RNxKhYGkZsLfQJxTrrenvrn', skills: ['Solidity', 'React', 'Web3', 'Solana', 'Anchor'] },
  { address: 'BPFLoaderUpgradeab1e11111111111111111111111', skills: ['Rust', 'Solana', 'Systems Programming', 'C++'] },
  { address: '5ZWj7a1f8tWkjBESHKgrLmXshuXxqeY9SYcfbshpAqPG', skills: ['React', 'Next.js', 'GraphQL', 'TypeScript', 'CSS'] },
  { address: 'Ard2Rz6TZsnBFMb7sHFqEaJdxRaYG3B8T2ZH3B9Kdxzz', skills: ['UI/UX Design', 'Figma', 'React', 'Tailwind CSS'] },
  { address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', skills: ['Node.js', 'PostgreSQL', 'Docker', 'AWS', 'TypeScript'] },
  { address: '2V7t5NaKY7aGkwytCWQgvUYZfEr9XMwNChhJEakTExk6', skills: ['Smart Contracts', 'Anchor', 'Solana', 'Rust', 'Testing'] },
];

function calculateCompatibility(requiredSkills: string[], freelancerSkills: string[]): { score: number; matched: string[] } {
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase());
  const normalizedFreelancer = freelancerSkills.map(s => s.toLowerCase());

  const matched = freelancerSkills.filter(skill =>
    normalizedRequired.some(req =>
      normalizedFreelancer.includes(req) && skill.toLowerCase() === req
    )
  );

  const score = normalizedRequired.length > 0
    ? Math.min(0.99, (matched.length / normalizedRequired.length) * 0.85 + Math.random() * 0.15)
    : Math.random() * 0.5 + 0.3;

  return { score: parseFloat(score.toFixed(2)), matched };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchingResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobDescription, requiredSkills, budget, limit = 5 }: MatchingRequest = req.body;

    if (!jobDescription || !requiredSkills || !Array.isArray(requiredSkills)) {
      return res.status(400).json({ error: 'Missing required fields: jobDescription, requiredSkills (array)' });
    }

    if (typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({ error: 'Budget must be a positive number.' });
    }

    const startTime = Date.now();

    // TODO: Replace with actual AI matching engine integration
    // Currently returns mock results based on skill overlap
    const results: MatchResult[] = mockFreelancers
      .map(freelancer => {
        const { score, matched } = calculateCompatibility(requiredSkills, freelancer.skills);
        return {
          freelancerAddress: freelancer.address,
          compatibilityScore: score,
          matchedSkills: matched,
        };
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, Math.min(limit, 20));

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      results,
      total: results.length,
      processingTime,
    });
  } catch (error: any) {
    console.error('AI matching error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
