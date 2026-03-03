import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';
import { inflateSync, inflateRawSync } from 'zlib';

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
};

export interface RiskAssessmentRequest {
  jobDescription: string;
  cvText?: string;
  cvUri?: string;
  jobTitle?: string;
  bidBudgetSol?: number;
  jobBudgetSol?: number;
  bidTimelineDays?: number;
}

export interface RiskFinding {
  type: 'positive' | 'warning' | 'danger';
  category?: 'skills' | 'budget' | 'timeline' | 'proposal' | 'credibility';
  text: string;
}

export interface RiskAssessmentResult {
  matchScore: number;
  authenticityScore: number;
  budgetScore: number;
  timelineScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  summary: string;
  findings: RiskFinding[];
  recommendation: string;
}

interface ErrorResponse { error: string }

/** Strip non-printable / non-ASCII chars so binary garbage can't corrupt the LLM prompt */
function sanitize(s: string): string {
  return s.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeRiskLevel(matchScore: number, authenticityScore: number, budgetScore: number, timelineScore: number) {
  const composite = matchScore * 0.35 + authenticityScore * 0.35 + budgetScore * 0.15 + timelineScore * 0.15;
  const riskScore = Math.round(100 - composite);
  const riskLevel = riskScore <= 35 ? 'LOW' : riskScore <= 60 ? 'MEDIUM' : 'HIGH';
  return { riskLevel, riskScore } as const;
}

function normalizeCid(uri: string): string {
  const m = uri.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})/i);
  if (m) return m[1];
  return uri.replace(/^ipfs:\/\//i, '').replace(/^\/+/, '').replace(/^ipfs\//i, '').trim();
}

/** Extract text tokens from a single PDF content stream string */
function extractFromStream(source: string, texts: string[]) {
  // (string)Tj / (string)' / (string)"
  const re = /\(([^)]{1,300})\)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const t = m[1]
      .replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
      .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
    if (/[a-zA-Z]{2,}/.test(t)) texts.push(t.trim());
  }
  // [(string)(string)]TJ
  const reArr = /\[([^\]]{1,500})\]\s*TJ/g;
  while ((m = reArr.exec(source)) !== null) {
    const subRe = /\(([^)]{1,200})\)/g;
    let sub: RegExpExecArray | null;
    const parts: string[] = [];
    while ((sub = subRe.exec(m[1])) !== null) {
      const t = sub[1].replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
      if (/[a-zA-Z]{2,}/.test(t)) parts.push(t.trim());
    }
    if (parts.length) texts.push(parts.join(' '));
  }
  // <hex>Tj  — single-byte hex encoding
  const hexRe = /<([0-9A-Fa-f]{2,})>\s*(?:Tj|'|")/g;
  while ((m = hexRe.exec(source)) !== null) {
    let t = '';
    const hex = m[1];
    for (let i = 0; i + 1 < hex.length; i += 2) {
      const code = parseInt(hex.slice(i, i + 2), 16);
      if (code >= 32 && code <= 126) t += String.fromCharCode(code);
    }
    if (t.length >= 2 && /[a-zA-Z]{2,}/.test(t)) texts.push(t.trim());
  }
}

/** Extract readable text from PDF buffer.
 *  Primary: unpdf (pdfjs-dist with proper Node.js/serverless setup — handles CIDFonts, compressed streams).
 *  Fallback: zlib+regex (for simple uncompressed PDFs).
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  // ── 1. Try unpdf (proper PDF parser, works in Vercel serverless) ──────────
  try {
    const { extractText } = await import('unpdf');
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    const result = sanitize(text);
    if (result.length > 20) return result;
  } catch (e) {
    console.warn('[PDF] unpdf failed, falling back to regex:', (e as Error).message?.slice(0, 80));
  }

  // ── 2. Fallback: zlib decompression + regex ───────────────────────────────
  try {
    const str = buffer.toString('latin1');
    const texts: string[] = [];
    const sources: string[] = [str];
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let sm: RegExpExecArray | null;
    while ((sm = streamRe.exec(str)) !== null) {
      const raw = Buffer.from(sm[1], 'latin1');
      for (const decompress of [inflateSync, inflateRawSync]) {
        try { sources.push(decompress(raw).toString('latin1')); break; } catch { /* try next */ }
      }
    }
    for (const src of sources) extractFromStream(src, texts);
    return sanitize(texts.join(' '));
  } catch {
    return '';
  }
}

/** Fetch CV from IPFS and extract text. Never throws. */
async function fetchCvText(cvUri: string): Promise<string> {
  try {
    const cid = normalizeCid(cvUri.trim());
    if (!cid || cid.length < 8) return '';

    const dedicatedGw = (() => {
      try {
        const gw = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
        return gw ? new URL(gw).origin + '/ipfs/' + cid : null;
      } catch { return null; }
    })();

    const gateways = [
      ...(dedicatedGw ? [dedicatedGw] : []),
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
    ];

    for (const url of gateways) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/pdf,text/plain,*/*' },
        });
        if (timer) { clearTimeout(timer); timer = null; }
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length < 10) continue;

        const isPdf =
          contentType.includes('pdf') ||
          (buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF');

        if (isPdf) {
          const text = await extractPdfText(buffer);
          if (text.length > 20) return text;
          return '';
        } else {
          const text = sanitize(buffer.toString('utf-8'));
          if (text.length > 10) return text;
        }
      } catch {
        if (timer) clearTimeout(timer);
        continue;
      }
    }
  } catch { }
  return '';
}

/**
 * Parse model output — tries JSON first, then extracts from plain text.
 * Never throws.
 */
function parseModelOutput(raw: string): {
  matchScore: number; authenticityScore: number;
  budgetScore: number; timelineScore: number;
  summary: string; findings: RiskFinding[]; recommendation: string;
} | null {
  // ── 1. Try JSON (strip fences, find first { ... last }) ───────────────────
  try {
    let s = raw.replace(/^```(?:json)?\n?/im, '').replace(/\n?```\s*$/im, '').trim();
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a !== -1 && b > a) s = s.slice(a, b + 1);
    const p = JSON.parse(s);
    if (p && typeof p.matchScore === 'number') return p;
  } catch { /* fall through */ }

  // ── 2. Regex extraction from plain text ───────────────────────────────────
  const num = (patterns: RegExp[]): number | null => {
    for (const re of patterns) {
      const m = raw.match(re);
      if (m) return Math.min(100, Math.max(0, parseInt(m[1], 10)));
    }
    return null;
  };

  const matchScore = num([
    /match(?:ing)?\s*score[:\s]+(\d+)/i,
    /\bfit[:\s]+(\d+)/i,
    /"matchScore"\s*:\s*(\d+)/i,
  ]) ?? 50;

  const authenticityScore = num([
    /authentic(?:ity)?\s*score[:\s]+(\d+)/i,
    /credib(?:ility|le)[:\s]+(\d+)/i,
    /"authenticityScore"\s*:\s*(\d+)/i,
  ]) ?? 50;

  // Extract sentences after known labels
  const after = (re: RegExp) => {
    const m = raw.match(re);
    return m ? m[1].replace(/["*_]/g, '').trim() : '';
  };

  const summary = after(/summary[:\s]+([^\n.]{10,200}[.\n]?)/i)
    || raw.split('\n').find(l => l.trim().length > 30 && !/score|finding|recommend/i.test(l))?.trim()
    || 'Assessment completed.';

  const recommendation = after(/recommend(?:ation)?[:\s]+([^\n.]{10,200}[.\n]?)/i)
    || 'Review the full profile before making a decision.';

  // Extract findings from bullet lines
  const findings: RiskFinding[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const clean = line.replace(/^[-•*]\s*/, '').replace(/["*_]/g, '').trim();
    if (clean.length < 10) continue;
    if (/positive|strength|good|strong|excellent|great/i.test(line)) {
      findings.push({ type: 'positive', text: clean });
    } else if (/danger|red flag|concern|risk|suspicious|lack|missing|exaggerat/i.test(line)) {
      findings.push({ type: 'danger', text: clean });
    } else if (/warning|unclear|vague|limited|consider|note|however/i.test(line)) {
      findings.push({ type: 'warning', text: clean });
    }
    if (findings.length >= 6) break;
  }
  if (!findings.length) {
    findings.push({ type: 'warning', text: 'Could not extract detailed findings from AI response.' });
  }

  const budgetScore = num([
    /budget\s*score[:\s]+(\d+)/i,
    /"budgetScore"\s*:\s*(\d+)/i,
  ]) ?? 50;

  const timelineScore = num([
    /timeline\s*score[:\s]+(\d+)/i,
    /"timelineScore"\s*:\s*(\d+)/i,
  ]) ?? 50;

  return { matchScore, authenticityScore, budgetScore, timelineScore, summary, findings, recommendation };
}

interface PromptContext {
  jobTitle: string;
  jobDesc: string;
  cvContent: string;
  note: string;
  bidBudgetSol?: number;
  jobBudgetSol?: number;
  bidTimelineDays?: number;
}

const buildPrompt = (ctx: PromptContext) => {
  const { jobTitle, jobDesc, cvContent, note, bidBudgetSol, jobBudgetSol, bidTimelineDays } = ctx;

  const budgetSection = (bidBudgetSol != null && jobBudgetSol != null && jobBudgetSol > 0)
    ? `\nBID PRICING:
- Job Budget: ${jobBudgetSol.toFixed(4)} SOL
- Freelancer's Bid: ${bidBudgetSol.toFixed(4)} SOL (${Math.round((bidBudgetSol / jobBudgetSol) * 100)}% of budget — ${bidBudgetSol < jobBudgetSol * 0.9 ? 'UNDER budget' : bidBudgetSol > jobBudgetSol * 1.1 ? 'OVER budget' : 'AT budget'})
`
    : bidBudgetSol != null ? `\nBID PRICING:\n- Freelancer's Bid: ${bidBudgetSol.toFixed(4)} SOL\n` : '';

  const timelineSection = bidTimelineDays != null
    ? `PROPOSED TIMELINE: ${bidTimelineDays} day${bidTimelineDays !== 1 ? 's' : ''}\n`
    : '';

  return `You are a senior technical recruiter and project manager. Analyze the job description and freelancer's CV/proposal below, then output ONLY a JSON object.

Job Title: ${jobTitle}

JOB DESCRIPTION:
${jobDesc.slice(0, 1800)}
${budgetSection}${timelineSection}
FREELANCER CV / PROPOSAL:
${cvContent.slice(0, 1800)}${note}

Output this exact JSON (all keys required):
{
  "matchScore": 70,
  "authenticityScore": 75,
  "budgetScore": 80,
  "timelineScore": 65,
  "summary": "2-3 sentences: overall verdict, strongest point, biggest concern.",
  "findings": [
    {"category": "skills", "type": "positive", "text": "Name the specific matched skill and how it applies to the job (e.g. '3 years Node.js matches the backend requirement; REST API experience is directly applicable')."},
    {"category": "skills", "type": "warning", "text": "Name the specific missing skill and why it matters (e.g. 'No Next.js experience mentioned — this is the core framework required, not just a nice-to-have')."},
    {"category": "skills", "type": "danger", "text": "If a critical required skill is completely absent, flag it here. Otherwise omit danger findings."},
    {"category": "budget", "type": "positive", "text": "State exact numbers: bid is X SOL vs job budget Y SOL (Z% under/over). Assess value-for-money given their experience level."},
    {"category": "timeline", "type": "warning", "text": "State the proposed timeline in days, assess whether it is realistic for the scope, and why (e.g. 'Performance audit + optimization typically takes 20-30 days; 15 days is tight without Next.js experience')."},
    {"category": "proposal", "type": "warning", "text": "Comment on proposal quality: does it address the specific requirements? Are there concrete deliverables mentioned? Or is it generic?"},
    {"category": "credibility", "type": "positive", "text": "Assess CV/proposal credibility: are claims specific, verifiable, with numbers? Or vague?"}
  ],
  "recommendation": "2 sentences: (1) hire / conditional hire / do not hire, (2) 2-3 specific things to verify or ask in an interview before deciding."
}

Rules:
- matchScore: 0-100 skill fit. authenticityScore: 0-100 CV credibility (specific+verifiable=high, vague=low).
- budgetScore: 100=great value under budget, 50=at budget, 0=overpriced or suspiciously cheap.
- timelineScore: 100=realistic with clear plan, 50=acceptable, 0=unrealistic or no plan given.
- findings: 5-8 items. category must be one of: "skills", "budget", "timeline", "proposal", "credibility".
- type must be exactly "positive", "warning", or "danger". Be specific — name technologies, quote numbers.

Output ONLY the JSON starting with { and ending with }.`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RiskAssessmentResult | ErrorResponse>,
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobDescription, cvText = '', cvUri, jobTitle, bidBudgetSol, jobBudgetSol, bidTimelineDays }: RiskAssessmentRequest = req.body;

  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 10) {
    return res.status(400).json({ error: 'jobDescription is required (min 10 chars)' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI service not configured. Add GROQ_API_KEY to Vercel env vars (free at console.groq.com).',
    });
  }

  // ── Build CV content ───────────────────────────────────────────────────────
  const parts: string[] = [];
  const notes: string[] = [];
  let hasCvFile = false;

  if (cvUri && cvUri.trim()) {
    hasCvFile = true;
    const fileText = await fetchCvText(cvUri.trim());
    if (fileText) {
      parts.push(fileText);
    } else {
      notes.push('[Note: The attached CV file is a compressed or image-based PDF and its text could not be extracted. You MUST still evaluate the candidate using the bid proposal text provided below. Score them fairly based solely on what is written in the proposal — do NOT assign 0 scores simply because the PDF file was unreadable.]');
    }
  }

  if (cvText && cvText.trim()) {
    const label = parts.length ? '\n\n--- Bid Proposal ---\n\n' : '';
    parts.push(label + cvText.trim());
  }

  if (!parts.length) {
    return res.status(400).json({
      error: hasCvFile
        ? 'CV file is image-based (scanned PDF) — text cannot be extracted. Ask the freelancer to include text in their proposal.'
        : 'No CV content found. The freelancer has not submitted a proposal or readable CV file.',
    });
  }

  const fullCvText = sanitize(parts.join(''));
  const note = notes.length ? '\n' + notes.join('\n') : '';

  // ── Call Groq ──────────────────────────────────────────────────────────────
  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: buildPrompt({
        jobTitle: jobTitle || 'Not specified',
        jobDesc: sanitize(jobDescription),
        cvContent: fullCvText,
        note,
        bidBudgetSol,
        jobBudgetSol,
        bidTimelineDays,
      }),
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const parsed = parseModelOutput(raw);
    if (!parsed) {
      console.error('Could not parse model output:', raw.slice(0, 300));
      return res.status(500).json({ error: 'AI returned unexpected format. Please try again.' });
    }

    const clamp = (v: any, def = 50) => Math.max(0, Math.min(100, Math.round(v ?? def)));
    const matchScore        = clamp(parsed.matchScore);
    const authenticityScore = clamp(parsed.authenticityScore);
    const budgetScore       = clamp(parsed.budgetScore);
    const timelineScore     = clamp(parsed.timelineScore);
    const { riskLevel, riskScore } = computeRiskLevel(matchScore, authenticityScore, budgetScore, timelineScore);

    return res.status(200).json({
      matchScore, authenticityScore, budgetScore, timelineScore, riskLevel, riskScore,
      summary:        parsed.summary || '',
      findings:       Array.isArray(parsed.findings) ? parsed.findings.slice(0, 8) : [],
      recommendation: parsed.recommendation || '',
    });
  } catch (err: any) {
    console.error('Risk assessment error:', err);
    const msg: string = err?.message || String(err);
    if (msg.includes('rate_limit') || msg.includes('429')) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }
    if (msg.includes('401') || msg.includes('invalid_api_key')) {
      return res.status(503).json({ error: 'Invalid Groq API key. Check GROQ_API_KEY in Vercel env vars.' });
    }
    return res.status(500).json({ error: `AI analysis failed: ${msg.slice(0, 120)}` });
  }
}
