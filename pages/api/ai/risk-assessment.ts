import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RiskAssessmentRequest {
  jobDescription: string;
  cvText?: string;
  cvUri?: string;   // IPFS hash or "ipfs://..." for uploaded PDF/file CV
  jobTitle?: string;
}

export interface RiskFinding {
  type: 'positive' | 'warning' | 'danger';
  text: string;
}

export interface RiskAssessmentResult {
  matchScore: number;          // 0–100: how well CV fits job
  authenticityScore: number;   // 0–100: how credible/real CV seems
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;           // 0–100: overall risk (higher = more risky)
  summary: string;
  findings: RiskFinding[];
  recommendation: string;
}

interface ErrorResponse {
  error: string;
}

function computeRiskLevel(matchScore: number, authenticityScore: number): {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
} {
  const combinedScore = matchScore * 0.5 + authenticityScore * 0.5;
  const riskScore = Math.round(100 - combinedScore);
  const riskLevel = riskScore <= 35 ? 'LOW' : riskScore <= 60 ? 'MEDIUM' : 'HIGH';
  return { riskLevel, riskScore };
}

/**
 * Fetch file from IPFS via multiple gateways and extract text.
 * Supports PDF (via pdf-parse/lib/pdf-parse — avoids Vercel fs issue)
 * and plain text files.
 * Never throws — returns '' on any failure.
 */
async function extractTextFromIpfs(cvUri: string): Promise<string> {
  try {
    const uri = cvUri.trim();
    if (!uri || uri.length < 8) return '';

    let gateways: string[];

    if (uri.startsWith('http')) {
      // Full URL supplied — sanitize any accidental double /ipfs/ segments
      const cleanUrl = uri.replace(/\/ipfs\/+\/ipfs\//g, '/ipfs/');
      gateways = [cleanUrl];
    } else {
      // Strip ipfs:// prefix (case-insensitive)
      let cid = uri.replace(/^ipfs:\/\//i, '');
      // Strip any remaining leading slashes: "/ipfs/Qm" → "ipfs/Qm"
      cid = cid.replace(/^\/+/, '');
      // Strip ipfs/ path segment if present: "ipfs/Qm" → "Qm"
      cid = cid.replace(/^ipfs\//i, '');
      cid = cid.trim();
      if (!cid || cid.length < 8) return '';

      gateways = [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
      ];
    }

    for (const url of gateways) {
      // Validate URL before fetching to avoid "Invalid URL" TypeError
      try { new URL(url); } catch { continue; }

      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/pdf,text/plain,*/*' },
        });
        if (timer) { clearTimeout(timer); timer = null; }

        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isPdf =
          contentType.includes('pdf') ||
          url.toLowerCase().includes('.pdf') ||
          (buffer.length > 4 && buffer.slice(0, 4).toString('ascii') === '%PDF');

        if (isPdf) {
          try {
            // lib path avoids pdf-parse loading test files (Vercel serverless issue)
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pdfParse = require('pdf-parse/lib/pdf-parse');
            const data = await pdfParse(buffer);
            const text = (data.text || '').trim();
            if (text.length > 10) return text;
          } catch {
            continue; // image-based PDF or parse error — try next gateway
          }
        } else {
          const text = buffer.toString('utf-8').trim();
          if (text.length > 10) return text;
        }
      } catch {
        if (timer) clearTimeout(timer);
        continue; // gateway timeout, network error, etc.
      }
    }
  } catch {
    // Top-level guard — never propagate errors from this function
  }
  return '';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RiskAssessmentResult | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobDescription, cvText = '', cvUri, jobTitle }: RiskAssessmentRequest = req.body;

  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 10) {
    return res.status(400).json({ error: 'jobDescription is required (min 10 chars)' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    return res.status(503).json({
      error: 'AI service not configured. Add GEMINI_API_KEY to your .env.local (free at aistudio.google.com).',
    });
  }

  // ── Build combined CV text ────────────────────────────────────────────────
  let ipfsText = '';
  let ipfsFailed = false;
  if (cvUri && cvUri.trim()) {
    ipfsText = await extractTextFromIpfs(cvUri.trim());
    if (!ipfsText) ipfsFailed = true;
  }

  // Combine: IPFS/PDF text first, then proposal text as supplement
  const parts: string[] = [];
  if (ipfsText) parts.push(ipfsText);
  if (cvText && cvText.trim()) parts.push(cvText.trim());
  const fullCvText = parts.join('\n\n--- Bid Proposal ---\n\n');

  // Only hard-fail if there is literally nothing to analyze
  if (!fullCvText.trim()) {
    return res.status(400).json({
      error: 'No CV content found. The freelancer has not submitted a proposal or readable CV file.',
    });
  }

  // If PDF/IPFS failed but we have proposal text, note it for the AI
  const cvNote = ipfsFailed && cvText?.trim()
    ? '\n[Note: The uploaded CV file could not be parsed — analysis is based on the text proposal only.]'
    : '';

  // ── Build prompt ──────────────────────────────────────────────────────────
  const prompt = `You are an expert HR analyst and risk assessor for a decentralized freelance marketplace on Solana blockchain.

Analyze the following job description and freelancer CV/resume to assess:
1. How well the CV matches the job requirements (match score)
2. Whether the CV appears authentic and credible (authenticity score)
3. Overall hiring risk

Job Title: ${jobTitle || 'Not specified'}

=== JOB DESCRIPTION ===
${jobDescription.slice(0, 3000)}

=== FREELANCER CV / RESUME ===
${fullCvText.slice(0, 3000)}${cvNote}

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "matchScore": <integer 0-100>,
  "authenticityScore": <integer 0-100>,
  "summary": "<1-2 sentence overall assessment>",
  "findings": [
    { "type": "positive"|"warning"|"danger", "text": "<finding>" }
  ],
  "recommendation": "<1 sentence recommendation for the client>"
}

Scoring guidelines:
- matchScore: 80-100 = strong fit, 50-79 = partial fit, 0-49 = poor fit
- authenticityScore: 80-100 = credible & detailed, 50-79 = plausible but vague, 0-49 = suspicious (exaggerated, inconsistent, generic)
- Include 3-6 findings, mix of positive/warning/danger
- Be objective and concise`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 1024,
        temperature: 0.3,
      },
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    // Strip markdown fences if present
    const jsonText = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed: {
      matchScore: number;
      authenticityScore: number;
      summary: string;
      findings: RiskFinding[];
      recommendation: string;
    };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error('Failed to parse Gemini response:', rawText);
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }

    const matchScore = Math.max(0, Math.min(100, Math.round(parsed.matchScore ?? 50)));
    const authenticityScore = Math.max(0, Math.min(100, Math.round(parsed.authenticityScore ?? 50)));
    const { riskLevel, riskScore } = computeRiskLevel(matchScore, authenticityScore);

    return res.status(200).json({
      matchScore,
      authenticityScore,
      riskLevel,
      riskScore,
      summary: parsed.summary || '',
      findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 8) : [],
      recommendation: parsed.recommendation || '',
    });
  } catch (err: any) {
    console.error('Risk assessment error:', err);
    if (err?.message?.includes('API_KEY_INVALID') || err?.status === 400) {
      return res.status(503).json({ error: 'Invalid Gemini API key. Check GEMINI_API_KEY in .env.local.' });
    }
    return res.status(500).json({ error: 'AI analysis failed. Please try again.' });
  }
}
