import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

interface VerificationRequest {
  jobAddress: string;
  verificationType: string;
  deliverableUri: string;
}

interface VerificationResponse {
  requestId: string;
  status: 'processing';
  estimatedTime: number;
}

interface ErrorResponse {
  error: string;
}

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

    // TODO: Replace with actual AI verification pipeline integration
    // This would typically:
    // 1. Queue the verification job
    // 2. Fetch deliverable from IPFS
    // 3. Run AI analysis based on verification type
    // 4. Store results and update on-chain status
    // Currently returns a mock processing response

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

    return res.status(202).json({
      requestId,
      status: 'processing',
      estimatedTime,
    });
  } catch (error: any) {
    console.error('AI verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
