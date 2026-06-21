import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

interface VerificationRequest {
  jobAddress: string;
  verificationType: string;
  deliverableUri: string;
}

interface VerificationFinding {
  type: 'pass' | 'warning' | 'fail';
  text: string;
}

interface VerificationResponse {
  requestId: string;
  status: 'completed' | 'processing';
  verificationType: string;
  score?: number;        // 0-100 quality/completeness
  confidence?: number;   // 0-1
  passed?: boolean;
  summary?: string;
  findings?: VerificationFinding[];
  estimatedTime?: number;
}

interface ErrorResponse {
  error: string;
}

// What the AI should focus on for each verification type.
const verificationFocus: Record<string, string> = {
  code_review: 'code correctness, structure, readability, security issues, and best practices',
  design_review: 'visual consistency, usability, accessibility, and adherence to the brief',
  document_review: 'clarity, completeness, accuracy, structure, and professionalism',
  deliverable_completeness: 'whether all stated requirements and deliverables appear to be addressed',
  plagiarism_check: 'signs of copied/boilerplate content, originality, and authenticity',
  quality_assessment: 'overall quality, polish, and fitness for the intended purpose',
};

const validVerificationTypes = [
  'code_review',
  'design_review',
  'document_review',
  'deliverable_completeness',
  'plagiarism_check',
  'quality_assessment',
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { aiRateLimit } = await import('../../../src/utils/rateLimit');
  if (!aiRateLimit(req, res)) return;

  try {
    const { jobAddress, verificationType, deliverableUri }: VerificationRequest = req.body;

    if (!jobAddress || typeof jobAddress !== 'string') {
      return res.status(400).json({ error: 'Missing required field: jobAddress (string)' });
    }

    if (!verificationType || typeof verificationType !== 'string') {
      return res.status(400).json({ error: 'Missing required field: verificationType (string)' });
    }

    if (!validVerificationTypes.includes(verificationType)) {
      return res.status(400).json({
        error: `Invalid verificationType. Must be one of: ${validVerificationTypes.join(', ')}`,
      });
    }

    if (!deliverableUri || typeof deliverableUri !== 'string') {
      return res.status(400).json({ error: 'Missing required field: deliverableUri (string)' });
    }

    const requestId = randomBytes(16).toString('hex');

    // Estimated processing time varies by verification type (in seconds)
    const estimatedTimes: Record<string, number> = {
      code_review: 120,
      design_review: 90,
      document_review: 60,
      deliverable_completeness: 45,
      plagiarism_check: 180,
      quality_assessment: 150,
    };
    const estimatedTime = estimatedTimes[verificationType] || 120;

    // ── Real AI verification pipeline ────────────────────────────────────────
    // 1. Fetch deliverable from IPFS  2. Run AI analysis for the type.
    // Falls back to a 'processing' acknowledgement if the content can't be read
    // or the AI service is unavailable.
    const { callGroqJSON, fetchIpfsText, getGroqKey } = await import('../../../src/utils/aiHelpers');

    if (getGroqKey()) {
      const content = await fetchIpfsText(deliverableUri);
      if (content && content.length > 20) {
        const focus = verificationFocus[verificationType] || 'overall quality';
        const ai = await callGroqJSON<{
          score: number; confidence: number; passed: boolean;
          summary: string; findings: VerificationFinding[];
        }>(
          `You are an automated deliverable verification oracle. Perform a ${verificationType.replace(/_/g, ' ')} ` +
          `focusing on ${focus}.\n\n` +
          `DELIVERABLE CONTENT:\n"""${content.slice(0, 5000)}"""\n\n` +
          `Output ONLY this JSON:\n` +
          `{"score": 0, "confidence": 0.0, "passed": true, "summary": "...", ` +
          `"findings": [{"type": "pass", "text": "..."}]}\n\n` +
          `Rules:\n- score: 0-100 quality/completeness.\n- confidence: 0.0-1.0.\n` +
          `- passed: true if score >= 70.\n- findings: 3-6 items, type one of "pass","warning","fail".\n` +
          `- summary: 1-2 sentences. Output ONLY the JSON object.`,
          { maxTokens: 700, temperature: 0.2 },
        );

        if (ai && typeof ai.score === 'number') {
          const score = Math.max(0, Math.min(100, Math.round(ai.score)));
          return res.status(200).json({
            requestId,
            status: 'completed',
            verificationType,
            score,
            confidence: parseFloat(Math.min(1, Math.max(0, ai.confidence ?? 0.8)).toFixed(2)),
            passed: typeof ai.passed === 'boolean' ? ai.passed : score >= 70,
            summary: ai.summary || '',
            findings: Array.isArray(ai.findings) ? ai.findings.slice(0, 6) : [],
          });
        }
      }
    }

    // ── Fallback: acknowledge the request for async/oracle processing ────────
    return res.status(202).json({
      requestId,
      status: 'processing',
      verificationType,
      estimatedTime,
    });
  } catch (error: any) {
    console.error('AI verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
