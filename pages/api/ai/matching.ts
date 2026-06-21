import type { NextApiRequest, NextApiResponse } from 'next';

interface MatchResult {
  freelancerAddress: string;
  compatibilityScore: number;
  matchedSkills: string[];
  completedJobs: number;
  averageRating: number;
  proposedRate: number;
}

interface MatchingRequest {
  jobDescription: string;
  requiredSkills: string[];
  budget: number;
  limit?: number;
}

interface MatchingResponse {
  matches: MatchResult[];
  total: number;
  processingTime: number;
}

interface ErrorResponse {
  error: string;
}

interface Freelancer {
  address: string;
  skills: string[];
  completedJobs: number;
  averageRating: number;
}

// Candidate freelancer pool. (In production this is sourced from on-chain
// profiles; here it is a curated pool that the AI/heuristic ranks against.)
const mockFreelancers: Freelancer[] = [
  { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', skills: ['React', 'TypeScript', 'Node.js', 'Solana', 'Rust'], completedJobs: 42, averageRating: 4.9 },
  { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', skills: ['Python', 'Machine Learning', 'Data Science', 'TypeScript'], completedJobs: 28, averageRating: 4.7 },
  { address: '3Hk5YmKbcHCFBjfRSqeP8RNxKhYGkZsLfQJxTrrenvrn', skills: ['Solidity', 'React', 'Web3', 'Solana', 'Anchor'], completedJobs: 35, averageRating: 4.8 },
  { address: 'BPFLoaderUpgradeab1e11111111111111111111111', skills: ['Rust', 'Solana', 'Systems Programming', 'C++'], completedJobs: 19, averageRating: 4.6 },
  { address: '5ZWj7a1f8tWkjBESHKgrLmXshuXxqeY9SYcfbshpAqPG', skills: ['React', 'Next.js', 'GraphQL', 'TypeScript', 'CSS'], completedJobs: 51, averageRating: 4.9 },
  { address: 'Ard2Rz6TZsnBFMb7sHFqEaJdxRaYG3B8T2ZH3B9Kdxzz', skills: ['UI/UX Design', 'Figma', 'React', 'Tailwind CSS'], completedJobs: 23, averageRating: 4.5 },
  { address: 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', skills: ['Node.js', 'PostgreSQL', 'Docker', 'AWS', 'TypeScript'], completedJobs: 37, averageRating: 4.7 },
  { address: '2V7t5NaKY7aGkwytCWQgvUYZfEr9XMwNChhJEakTExk6', skills: ['Smart Contracts', 'Anchor', 'Solana', 'Rust', 'Testing'], completedJobs: 44, averageRating: 4.8 },
];

// Deterministic skill-overlap scoring (used as fallback and to fill matchedSkills).
function calculateCompatibility(requiredSkills: string[], freelancerSkills: string[]): { score: number; matched: string[] } {
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());
  const matched = freelancerSkills.filter(skill => normalizedRequired.includes(skill.toLowerCase().trim()));

  const score = normalizedRequired.length > 0
    ? Math.min(0.99, (matched.length / normalizedRequired.length) * 0.9 + 0.05)
    : 0.4;

  return { score: parseFloat(score.toFixed(2)), matched };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchingResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { aiRateLimit } = await import('../../../src/utils/rateLimit');
  if (!aiRateLimit(req, res)) return;

  try {
    const { jobDescription, requiredSkills, budget, limit = 5 }: MatchingRequest = req.body;

    if (!jobDescription || !requiredSkills || !Array.isArray(requiredSkills)) {
      return res.status(400).json({ error: 'Missing required fields: jobDescription, requiredSkills (array)' });
    }

    if (typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({ error: 'Budget must be a positive number.' });
    }

    const startTime = Date.now();
    const cap = Math.min(limit, 20);

    // ── Real AI semantic matching via Groq, with heuristic fallback ──────────
    const { callGroqJSON, sanitize } = await import('../../../src/utils/aiHelpers');

    const aiScores = await callGroqJSON<Array<{ address: string; score: number; matchedSkills: string[] }>>(
      `You are a freelancer-job matching engine. Score how well each candidate fits the job, ` +
      `considering semantic skill relevance (related/transferable skills count, not just exact matches), ` +
      `not literal string overlap.\n\n` +
      `JOB DESCRIPTION:\n"""${sanitize(jobDescription).slice(0, 1500)}"""\n` +
      `REQUIRED SKILLS: ${requiredSkills.join(', ')}\n` +
      `BUDGET: ${budget} SOL\n\n` +
      `CANDIDATES:\n${mockFreelancers.map(f => `- ${f.address}: ${f.skills.join(', ')} (${f.completedJobs} jobs, ${f.averageRating}★)`).join('\n')}\n\n` +
      `Output ONLY a JSON array, one entry per candidate:\n` +
      `[{"address": "...", "score": 0.0, "matchedSkills": ["skill"]}]\n` +
      `score is 0.0-1.0 overall fit. matchedSkills lists the candidate skills relevant to this job.`,
      { maxTokens: 900, temperature: 0.2 },
    );

    const aiByAddr = new Map<string, { score: number; matchedSkills: string[] }>();
    if (Array.isArray(aiScores)) {
      for (const s of aiScores) {
        if (s && typeof s.address === 'string' && typeof s.score === 'number') {
          aiByAddr.set(s.address, {
            score: Math.max(0, Math.min(1, s.score)),
            matchedSkills: Array.isArray(s.matchedSkills) ? s.matchedSkills.map(String) : [],
          });
        }
      }
    }

    const matches: MatchResult[] = mockFreelancers
      .map(freelancer => {
        const heuristic = calculateCompatibility(requiredSkills, freelancer.skills);
        const ai = aiByAddr.get(freelancer.address);
        const compatibilityScore = ai ? parseFloat(ai.score.toFixed(2)) : heuristic.score;
        const matchedSkills = ai && ai.matchedSkills.length ? ai.matchedSkills : heuristic.matched;
        // Proposed rate scales the budget by fit (better fit -> nearer full budget).
        const proposedRate = parseFloat((budget * (0.6 + compatibilityScore * 0.4)).toFixed(2));
        return {
          freelancerAddress: freelancer.address,
          compatibilityScore,
          matchedSkills,
          completedJobs: freelancer.completedJobs,
          averageRating: freelancer.averageRating,
          proposedRate,
        };
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, cap);

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      matches,
      total: matches.length,
      processingTime,
    });
  } catch (error: any) {
    console.error('AI matching error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
