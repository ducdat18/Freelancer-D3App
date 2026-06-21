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
  const { aiRateLimit } = await import('../../../src/utils/rateLimit');
  if (!aiRateLimit(req, res)) return;

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

    // ── Structural checks (length) run regardless of AI availability ──────────
    const flags: string[] = [];
    let totalWeight = 0;

    if (content.length > rules.maxLength) {
      flags.push('content_too_long');
      totalWeight += 0.3;
    }
    if (content.trim().length < rules.requiredMinLength) {
      flags.push('content_too_short');
      totalWeight += 0.5;
    }

    // ── Real AI moderation via Groq, with pattern-based heuristic fallback ────
    const { callGroqJSON, sanitize } = await import('../../../src/utils/aiHelpers');

    const aiResult = await callGroqJSON<{
      approved: boolean;
      flags: string[];
      confidence: number;
      severity?: number;
    }>(
      `You are a content moderation system for a professional freelance marketplace. ` +
      `Analyze the following ${contentType.replace('_', ' ')} for policy violations: scams, fraud, ` +
      `phishing/credential theft, misleading financial claims, harassment, spam, illegal activity, ` +
      `or otherwise inappropriate content.\n\n` +
      `CONTENT:\n"""${sanitize(content).slice(0, 4000)}"""\n\n` +
      `Output ONLY this JSON:\n` +
      `{"approved": true, "severity": 0.0, "flags": ["snake_case_reason"], "confidence": 0.0}\n\n` +
      `Rules:\n` +
      `- severity: 0.0 (clean) to 1.0 (severe violation).\n` +
      `- approved: true only if severity < 0.7.\n` +
      `- flags: short snake_case reasons for any concerns (empty array if clean).\n` +
      `- confidence: 0.0-1.0 how confident you are in this assessment.\n` +
      `Output ONLY the JSON object.`,
      { maxTokens: 400, temperature: 0.1 },
    );

    if (aiResult && typeof aiResult.approved === 'boolean' && Array.isArray(aiResult.flags)) {
      // Merge structural flags with AI flags; structural issues can override approval.
      const mergedFlags = Array.from(new Set([...flags, ...aiResult.flags.map(String)]));
      const severity = typeof aiResult.severity === 'number' ? aiResult.severity : (aiResult.approved ? 0.1 : 0.8);
      const approved = aiResult.approved && totalWeight < 0.7 && severity < 0.7;
      const confidence = parseFloat(
        Math.min(0.99, Math.max(0.5, typeof aiResult.confidence === 'number' ? aiResult.confidence : 0.7)).toFixed(2),
      );
      return res.status(200).json({ approved, flags: mergedFlags, confidence });
    }

    // ── Fallback: pattern-based detection ────────────────────────────────────
    for (const { pattern, flag, weight } of flagPatterns) {
      if (pattern.test(content)) {
        flags.push(flag);
        totalWeight += weight;
      }
    }

    const confidence = parseFloat(Math.min(0.99, 0.5 + totalWeight * 0.3).toFixed(2));
    const approved = totalWeight < 0.7;

    return res.status(200).json({ approved, flags, confidence });
  } catch (error: any) {
    console.error('Content moderation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
