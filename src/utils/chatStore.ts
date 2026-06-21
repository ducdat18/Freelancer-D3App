/**
 * Persistent file-based chat store.
 * Uses a JSON file on disk so messages survive serverless cold starts and restarts.
 * For production at scale, swap with Vercel KV / Supabase / PlanetScale.
 */
import fs from 'fs'
import path from 'path'
import { emitToWallet } from './sseEmitter'

export interface Message {
  id: number
  sender: string
  recipient: string
  content: string
  timestamp: number
  read: boolean
}

interface Store {
  nextId: number
  messages: Message[]
}

// On Vercel, only /tmp is writable. Locally use project root.
const DATA_DIR = process.env.VERCEL
  ? '/tmp/chat-data'
  : path.join(process.cwd(), '.chat-data')
const DATA_FILE = path.join(DATA_DIR, 'messages.json')

// Simple write-lock flag to avoid concurrent writes corrupting the file.
// Good enough for low-traffic; at scale use a proper queue or DB.
let writing = false
const writeQueue: (() => void)[] = []

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readStore(): Store {
  ensureDir()
  try {
    if (!fs.existsSync(DATA_FILE)) return { nextId: 1, messages: [] }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw) as Store
  } catch {
    return { nextId: 1, messages: [] }
  }
}

function flushWrite(store: Store) {
  return new Promise<void>((resolve) => {
    const doWrite = () => {
      try {
        ensureDir()
        fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
      } catch (e) {
        console.error('[chatStore] write error:', e)
      }
      writing = false
      const next = writeQueue.shift()
      if (next) { writing = true; next() }
      resolve()
    }

    if (writing) {
      writeQueue.push(doWrite)
    } else {
      writing = true
      doWrite()
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMessages(walletAddress: string, other: string): Message[] {
  const { messages } = readStore()
  return messages.filter(
    m => (m.sender === walletAddress && m.recipient === other) ||
         (m.sender === other && m.recipient === walletAddress)
  )
}

export async function addMessage(sender: string, recipient: string, content: string): Promise<Message> {
  const store = readStore()
  const msg: Message = {
    id: store.nextId++,
    sender,
    recipient,
    content,
    timestamp: Date.now(),
    read: false,
  }
  store.messages.push(msg)
  await flushWrite(store)

  // Push real-time notification to recipient via SSE
  emitToWallet(recipient, {
    type: 'new_message',
    payload: { sender, content: content.slice(0, 80), timestamp: msg.timestamp, messageId: msg.id },
  })

  return msg
}

export async function markAsRead(messageId: number, walletAddress: string): Promise<boolean> {
  const store = readStore()
  const msg = store.messages.find(m => m.id === messageId)
  if (!msg || msg.recipient !== walletAddress) return false
  msg.read = true
  await flushWrite(store)
  return true
}

export function findMessage(messageId: number): Message | undefined {
  return readStore().messages.find(m => m.id === messageId)
}

export function getConversations(walletAddress: string) {
  const { messages } = readStore()
  const partnerSet = new Set<string>()
  messages.forEach(m => {
    if (m.sender === walletAddress) partnerSet.add(m.recipient)
    if (m.recipient === walletAddress) partnerSet.add(m.sender)
  })

  return Array.from(partnerSet).map(other => {
    const conv = messages
      .filter(
        m => (m.sender === walletAddress && m.recipient === other) ||
             (m.sender === other && m.recipient === walletAddress)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
    const unread = messages.filter(
      m => m.sender === other && m.recipient === walletAddress && !m.read
    ).length
    return {
      other_address: other,
      last_message_time: conv[0]?.timestamp ?? 0,
      last_message: conv[0]?.content ?? '',
      unread_count: unread,
    }
  }).sort((a, b) => b.last_message_time - a.last_message_time)
}
