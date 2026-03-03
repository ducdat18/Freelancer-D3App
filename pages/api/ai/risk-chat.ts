import type { NextApiRequest, NextApiResponse } from 'next';
import Groq from 'groq-sdk';

interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface RiskChatRequest {
  context: {
    jobTitle?: string;
    bidBudgetSol?: number;
    jobBudgetSol?: number;
    bidTimelineDays?: number;
    matchScore: number;
    authenticityScore: number;
    budgetScore: number;
    timelineScore: number;
    riskLevel: string;
    summary: string;
    findings: Array<{ type: string; category?: string; text: string }>;
    recommendation: string;
  };
  messages: ChatMessage[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  const { context, messages }: RiskChatRequest = req.body;
  if (!context || !Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const budgetLine = (context.bidBudgetSol != null && context.jobBudgetSol)
    ? `Bid: ${context.bidBudgetSol.toFixed(4)} SOL vs Job Budget: ${context.jobBudgetSol.toFixed(4)} SOL (${Math.round((context.bidBudgetSol / context.jobBudgetSol) * 100)}%)`
    : context.bidBudgetSol != null ? `Bid: ${context.bidBudgetSol.toFixed(4)} SOL` : 'N/A';

  const system = `You are a senior technical hiring advisor. A client is reviewing a freelancer bid and has an AI risk assessment result. Help them make a good hiring decision.

ASSESSMENT SUMMARY:
- Job: ${context.jobTitle || 'N/A'}
- Risk Level: ${context.riskLevel} (risk score ${100 - Math.round((context.matchScore * 0.35 + context.authenticityScore * 0.35 + context.budgetScore * 0.15 + context.timelineScore * 0.15))}/100)
- Job Match: ${context.matchScore}/100 | CV Quality: ${context.authenticityScore}/100 | Budget: ${context.budgetScore}/100 | Timeline: ${context.timelineScore}/100
- Budget: ${budgetLine}
- Timeline: ${context.bidTimelineDays != null ? context.bidTimelineDays + ' days' : 'N/A'}
- Summary: ${context.summary}
- Findings:
${context.findings.map(f => `  [${f.type.toUpperCase()}${f.category ? ' · ' + f.category : ''}] ${f.text}`).join('\n')}
- Recommendation: ${context.recommendation}

Answer the client's follow-up questions concisely (2-5 sentences). Be direct and specific. Suggest interview questions, verification steps, or red flags to probe when relevant.`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.4,
      max_tokens: 350,
    });
    const reply = completion.choices[0]?.message?.content?.trim() || 'No response generated.';
    return res.status(200).json({ reply });
  } catch (err: any) {
    const msg: string = err?.message || String(err);
    if (msg.includes('rate_limit') || msg.includes('429')) return res.status(429).json({ error: 'Rate limit. Wait a moment.' });
    return res.status(500).json({ error: `AI chat failed: ${msg.slice(0, 100)}` });
  }
}
