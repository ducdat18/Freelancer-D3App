import type { NextApiRequest, NextApiResponse } from 'next';

interface MatchResult {
  freelancerAddress: string;
  compatibilityScore: number;
  matchedSkills: string[];
  completedJobs: number;
  averageRating: number;
  proposedRate: number;
  reason?: string;
}

interface CandidateInput {
  address: string;
  skills?: string[];
  completedJobs?: number;
  averageRating?: number;
}

interface MatchingRequest {
  jobDescription: string;
  requiredSkills: string[];
  budget: number;
  limit?: number;
  /** Real on-chain freelancers supplied by the caller. When present, these are
   *  ranked instead of the built-in sample pool. */
  candidates?: CandidateInput[];
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
    const { jobDescription, requiredSkills, budget, limit = 5, candidates }: MatchingRequest = req.body;

    if (!jobDescription || !requiredSkills || !Array.isArray(requiredSkills)) {
      return res.status(400).json({ error: 'Missing required fields: jobDescription, requiredSkills (array)' });
    }

    if (typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({ error: 'Budget must be a positive number.' });
    }

    const startTime = Date.now();
    const cap = Math.min(limit, 20);

    // ── Candidate pool: real on-chain freelancers when supplied, else sample ──
    const usingReal = Array.isArray(candidates) && candidates.length > 0;
    const pool: Freelancer[] = usingReal
      ? candidates!
          .filter(c => c && typeof c.address === 'string' && c.address.length > 0)
          .slice(0, 40)
          .map(c => ({
            address: c.address,
            skills: Array.isArray(c.skills) ? c.skills.map(String) : [],
            completedJobs: Number(c.completedJobs) || 0,
            averageRating: Number(c.averageRating) || 0,
          }))
      : mockFreelancers;

    if (pool.length === 0) {
      return res.status(200).json({ matches: [], total: 0, processingTime: 0 });
    }

    // ── Real AI semantic matching via Groq, with heuristic fallback ──────────
    const { callGroqJSON, sanitize } = await import('../../../src/utils/aiHelpers');

    // When candidates carry no skills (on-chain reputation only), tell the model
    // to rank on the job's needs vs. each candidate's track record + reputation.
    const poolHasSkills = pool.some(f => f.skills.length > 0);
    const candidateLines = pool.map(f => {
      const skillPart = f.skills.length ? `skills: ${f.skills.join(', ')}; ` : 'no listed skills; ';
      return `- ${f.address}: ${skillPart}${f.completedJobs} completed jobs, ${f.averageRating.toFixed(1)}/5 avg rating`;
    }).join('\n');

    const aiScores = await callGroqJSON<Array<{ address: string; score: number; matchedSkills: string[]; reason: string }>>(
      `You are the matching engine of a decentralized Solana freelance marketplace. Rank each ` +
      `freelancer for the job below. Reward genuine fit: weigh semantic skill relevance (related and ` +
      `transferable skills count, not just exact string matches) most, then a proven track record ` +
      `(more completed jobs and higher average rating = more trustworthy and lower delivery risk). ` +
      (poolHasSkills
        ? `Penalize candidates missing the job's core requirements even if highly rated.\n\n`
        : `These candidates expose only on-chain reputation, not a skill list, so judge fit from their ` +
          `track record and reputation relative to the job's complexity and budget.\n\n`) +
      `JOB DESCRIPTION:\n"""${sanitize(jobDescription).slice(0, 1600)}"""\n` +
      `REQUIRED SKILLS: ${requiredSkills.length ? requiredSkills.join(', ') : 'not explicitly listed — infer from the description'}\n` +
      `BUDGET: ${budget} SOL\n\n` +
      `FREELANCERS:\n${candidateLines}\n\n` +
      `Output ONLY a JSON array, one entry per freelancer:\n` +
      `[{"address": "...", "score": 0.0, "matchedSkills": ["skill"], "reason": "one concrete sentence on why this rank"}]\n` +
      `score is 0.0-1.0 overall fit. matchedSkills = the candidate's skills relevant to this job ` +
      `(use [] if none listed). reason must name the specific factor that drove the score ` +
      `(a matched skill, the completed-job count, or the rating) — never generic filler.`,
      { maxTokens: 1100, temperature: 0.2 },
    );

    const aiByAddr = new Map<string, { score: number; matchedSkills: string[]; reason: string }>();
    if (Array.isArray(aiScores)) {
      for (const s of aiScores) {
        if (s && typeof s.address === 'string' && typeof s.score === 'number') {
          aiByAddr.set(s.address, {
            score: Math.max(0, Math.min(1, s.score)),
            matchedSkills: Array.isArray(s.matchedSkills) ? s.matchedSkills.map(String) : [],
            reason: typeof s.reason === 'string' ? s.reason.slice(0, 240) : '',
          });
        }
      }
    }

    const matches: MatchResult[] = pool
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
          reason: ai?.reason || '',
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
