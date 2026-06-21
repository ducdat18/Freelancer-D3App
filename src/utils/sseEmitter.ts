/**
 * Server-side SSE event bus.
 * Shared across API route handlers in the same Node.js process.
 * Clients subscribe via /api/notifications/stream?wallet=ADDRESS.
 */
import { EventEmitter } from 'events'

export interface SseEvent {
  type: 'new_message' | 'new_bid' | 'bid_accepted' | 'milestone_submitted' | 'payment_released'
  payload: Record<string, unknown>
}

// Singleton emitter — persists across requests in the same warm instance
const emitter: EventEmitter & { setMaxListeners: (n: number) => EventEmitter } = new EventEmitter()
emitter.setMaxListeners(200) // support up to 200 concurrent SSE clients

/**
 * Emit an event to a specific wallet address subscriber.
 * @param recipientWallet - the wallet address of the recipient
 * @param event - the event to send
 */
export function emitToWallet(recipientWallet: string, event: SseEvent) {
  emitter.emit(`wallet:${recipientWallet}`, event)
}

/**
 * Subscribe to events for a wallet. Returns an unsubscribe function.
 */
export function subscribeWallet(
  walletAddress: string,
  callback: (event: SseEvent) => void
): () => void {
  const channel = `wallet:${walletAddress}`
  emitter.on(channel, callback)
  return () => emitter.off(channel, callback)
}
