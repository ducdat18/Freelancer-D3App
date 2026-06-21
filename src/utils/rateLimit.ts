/**
 * Simple in-memory sliding-window rate limiter for Next.js API routes.
 * Per IP, per named limit group (e.g. "ai", "chat").
 * Good enough for low-traffic; at scale use Upstash Redis / Vercel KV.
 */
import type { NextApiRequest, NextApiResponse } from 'next'

interface WindowEntry {
  timestamps: number[]
}

// namespace → ip → window
const store = new Map<string, Map<string, WindowEntry>>()

interface LimitOptions {
  /** Unique name for this limit group, e.g. "ai" or "chat" */
  namespace: string
  /** Max requests allowed within the window */
  max: number
  /** Window size in milliseconds */
  windowMs: number
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

/**
 * Check rate limit. Returns true if the request is allowed, false if limited.
 * Call this at the top of your API handler.
 *
 * @example
 * if (!checkRateLimit(req, res, { namespace: 'ai', max: 10, windowMs: 60_000 })) return
 */
export function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: LimitOptions
): boolean {
  const { namespace, max, windowMs } = options
  const ip = getClientIp(req)
  const now = Date.now()
  const cutoff = now - windowMs

  if (!store.has(namespace)) store.set(namespace, new Map())
  const nsStore = store.get(namespace)!

  if (!nsStore.has(ip)) nsStore.set(ip, { timestamps: [] })
  const entry = nsStore.get(ip)!

  // Evict timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff)

  if (entry.timestamps.length >= max) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = Math.ceil((oldestInWindow + windowMs - now) / 1000)
    res.setHeader('Retry-After', String(retryAfterMs))
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', '0')
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfterSeconds: retryAfterMs,
    })
    return false
  }

  entry.timestamps.push(now)
  res.setHeader('X-RateLimit-Limit', String(max))
  res.setHeader('X-RateLimit-Remaining', String(max - entry.timestamps.length))
  return true
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/** 10 requests / minute — for expensive AI endpoints */
export function aiRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  return checkRateLimit(req, res, { namespace: 'ai', max: 10, windowMs: 60_000 })
}

/** 60 requests / minute — for chat endpoints */
export function chatRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  return checkRateLimit(req, res, { namespace: 'chat', max: 60, windowMs: 60_000 })
}
