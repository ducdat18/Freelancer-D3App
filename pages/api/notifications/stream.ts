/**
 * SSE endpoint: GET /api/notifications/stream?wallet=ADDRESS
 * Client connects once; server pushes events as they happen.
 * No auth required — events are scoped to the wallet address in the query param.
 * (For stricter security, add wallet signature verification.)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { subscribeWallet } from '../../../src/utils/sseEmitter'

// Disable Next.js body parser — SSE must stream
export const config = { api: { bodyParser: false } }

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const wallet = req.query.wallet
  if (!wallet || typeof wallet !== 'string' || wallet.length < 32) {
    return res.status(400).json({ error: 'Missing or invalid wallet param' })
  }

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx buffering
  })

  // Send a comment every 25s as a heartbeat to keep the connection alive
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n')
  }, 25_000)

  // Subscribe to server-side events for this wallet
  const unsubscribe = subscribeWallet(wallet, (event) => {
    res.write(`event: ${event.type}\n`)
    res.write(`data: ${JSON.stringify(event.payload)}\n\n`)
  })

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
}
