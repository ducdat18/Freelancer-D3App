import type { NextApiRequest, NextApiResponse } from 'next';

type ContentType = 'job_description' | 'proposal' | 'message';

interface ModerationRequest {
  content: string;
  contentType: ContentType;
}

interface ModerationResponse {
  approved: boolean;
  flags: string[];
  confidence: number;
}

interface ErrorResponse {
  error: string;
}

// Flagged patterns by category
const flagPatterns: { pattern: RegExp; flag: string; weight: number }[] = [
  { pattern: /\b(scam|fraud|ponzi|pyramid)\b/i, flag: 'potential_scam', weight: 0.9 },
  { pattern: /\b(hack|exploit|steal|phish)\b/i, flag: 'security_threat', weight: 0.85 },
  { pattern: /\b(guarantee[d]?\s+(return|profit|income))\b/i, flag: 'misleading_claims', weight: 0.8 },
  { pattern: /\b(send\s+me\s+(your|the)\s+(key|seed|password|private))\b/i, flag: 'credential_phishing', weight: 0.95 },
  { pattern: /\b(free\s+money|double\s+your|100x\s+return)\b/i, flag: 'too_good_to_be_true', weight: 0.85 },
  { pattern: /\b(nigerian?\s+prince|advance\s+fee)\b/i, flag: 'known_scam_pattern', weight: 0.95 },
  { pattern: /(https?:\/\/[^\s]+){5,}/i, flag: 'excessive_links', weight: 0.4 },
  { pattern: /(.)\1{10,}/i, flag: 'spam_repetition', weight: 0.5 },
  { pattern: /\b(inappropriate|offensive)\b/i, flag: 'inappropriate_content', weight: 0.3 },
  { pattern: /[A-Z\s]{30,}/i, flag: 'excessive_caps', weight: 0.2 },
];

// Content type specific rules
const contentTypeRules: Record<ContentType, { maxLength: number; requiredMinLength: number }> = {
  job_description: { maxLength: 10000, requiredMinLength: 20 },
  proposal: { maxLength: 5000, requiredMinLength: 10 },
  message: { maxLength: 2000, requiredMinLength: 1 },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModerationResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, contentType }: ModerationRequest = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing required field: content (string)' });
    }

    const validContentTypes: ContentType[] = ['job_description', 'proposal', 'message'];
    if (!contentType || !validContentTypes.includes(contentType)) {
      return res.status(400).json({
        error: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}`,
      });
    }

    const rules = contentTypeRules[contentType];

    // TODO: Replace with actual AI moderation model integration
    // Currently uses pattern-based detection as a placeholder

    const flags: string[] = [];
    let totalWeight = 0;

    // Check content length
    if (content.length > rules.maxLength) {
      flags.push('content_too_long');
      totalWeight += 0.3;
    }

    if (content.trim().length < rules.requiredMinLength) {
      flags.push('content_too_short');
      totalWeight += 0.5;
    }

    // Check against flag patterns
    for (const { pattern, flag, weight } of flagPatterns) {
      if (pattern.test(content)) {
        flags.push(flag);
        totalWeight += weight;
      }
    }

    // Calculate confidence (higher weight = more confident the content is problematic)
    const confidence = parseFloat(Math.min(0.99, 0.5 + totalWeight * 0.3).toFixed(2));

    // Content is approved if total weight is below threshold
    const approved = totalWeight < 0.7;

    return res.status(200).json({
      approved,
      flags,
      confidence,
    });
  } catch (error: any) {
    console.error('Content moderation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
