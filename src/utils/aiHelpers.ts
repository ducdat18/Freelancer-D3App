// Server-side AI helpers shared across the /api/ai/* endpoints.
// Centralises the Groq call + JSON parsing and IPFS text extraction so each
// endpoint can use real AI when GROQ_API_KEY is set and fall back to its own
// heuristic otherwise.

import Groq from 'groq-sdk';

export function getGroqKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

/** Strip non-printable / non-ASCII chars so binary garbage can't corrupt a prompt. */
export function sanitize(s: string): string {
  return s.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Pull the first JSON object/array out of a model response (handles ``` fences). */
export function parseJsonFromModel<T = any>(raw: string): T | null {
  if (!raw) return null;
  try {
    let s = raw.replace(/^```(?:json)?\n?/im, '').replace(/\n?```\s*$/im, '').trim();
    const objStart = s.indexOf('{');
    const arrStart = s.indexOf('[');
    const start = objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
    if (start === -1) return null;
    const openCh = s[start];
    const closeCh = openCh === '{' ? '}' : ']';
    const end = s.lastIndexOf(closeCh);
    if (end <= start) return null;
    return JSON.parse(s.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/**
 * Call Groq with a single user prompt and return the parsed JSON output.
 * Returns null on any failure (no key, network error, unparseable output) so
 * callers can fall back to their heuristic without throwing.
 */
export async function callGroqJSON<T = any>(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<T | null> {
  const apiKey = getGroqKey();
  if (!apiKey) return null;
  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 1024,
    });
    const raw = completion.choices[0]?.message?.content?.trim() || '';
    return parseJsonFromModel<T>(raw);
  } catch (err) {
    console.error('[aiHelpers] Groq call failed:', (err as Error)?.message?.slice(0, 120));
    return null;
  }
}

function normalizeCid(uri: string): string {
  const m = uri.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})/i);
  if (m) return m[1];
  return uri.replace(/^ipfs:\/\//i, '').replace(/^\/+/, '').replace(/^ipfs\//i, '').trim();
}

/** Fetch a deliverable/document from IPFS and return readable text. Never throws. */
export async function fetchIpfsText(uri: string, maxChars = 6000): Promise<string> {
  try {
    if (!uri || !uri.trim()) return '';
    const cid = normalizeCid(uri.trim());
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
          headers: { Accept: 'application/pdf,text/plain,application/json,*/*' },
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
          try {
            const { extractText } = await import('unpdf');
            const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
            const result = sanitize(text);
            if (result.length > 20) return result.slice(0, maxChars);
          } catch { /* fall through to raw */ }
          continue;
        }

        const text = sanitize(buffer.toString('utf-8'));
        if (text.length > 10) return text.slice(0, maxChars);
      } catch {
        if (timer) clearTimeout(timer);
        continue;
      }
    }
  } catch { /* ignore */ }
  return '';
}
