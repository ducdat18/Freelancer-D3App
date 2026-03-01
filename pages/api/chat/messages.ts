// Next.js API Route for Chat
// File: pages/api/chat/messages.ts (move this file there)

import type { NextApiRequest, NextApiResponse } from 'next'
import Database from 'better-sqlite3'
import path from 'path'
import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'chat.db')
const db = new Database(dbPath)

// Create messages table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_sender ON messages(sender);
  CREATE INDEX IF NOT EXISTS idx_recipient ON messages(recipient);
  CREATE INDEX IF NOT EXISTS idx_conversation ON messages(sender, recipient);
`)

interface Message {
  id: number
  sender: string
  recipient: string
  content: string
  timestamp: number
  read: boolean
}

/**
 * Verify Solana wallet signature
 * Verifies that the signature was created by the wallet address
 *
 * @param address - Wallet public key (base58 string)
 * @param signature - Signature of the message (base58 string)
 * @param message - Original message that was signed
 * @returns true if signature is valid
 */
function verifyWalletSignature(
  address: string,
  signature?: string,
  message?: string
): boolean {
  if (!address || !signature || !message) {
    return false
  }

  try {
    // Parse the public key
    const publicKey = new PublicKey(address)

    // Decode the signature from base58
    const signatureUint8 = bs58.decode(signature)

    // Encode the message to Uint8Array
    const messageUint8 = new TextEncoder().encode(message)

    // Verify the signature using tweetnacl
    const verified = nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      publicKey.toBytes()
    )

    return verified
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Generate authentication message for signing
 * @param address - Wallet address
 * @returns Message to be signed by the wallet
 */
export function generateAuthMessage(address: string): string {
  const timestamp = Date.now()
  return `Authenticate to Freelance DApp\nWallet: ${address}\nTimestamp: ${timestamp}`
}

/**
 * Validate that the signed message is recent (within 5 minutes)
 * @param message - The message that was signed
 * @returns true if message is recent
 */
function isMessageRecent(message: string): boolean {
  try {
    const timestampMatch = message.match(/Timestamp: (\d+)/)
    if (!timestampMatch) return false

    const messageTimestamp = parseInt(timestampMatch[1])
    const currentTimestamp = Date.now()
    const fiveMinutes = 5 * 60 * 1000

    return currentTimestamp - messageTimestamp < fiveMinutes
  } catch {
    return false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Wallet-Signature, X-Signed-Message')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Get wallet address from Authorization header
    const walletAddress = req.headers.authorization?.replace('Bearer ', '')

    // Get signature and message from custom headers
    const signature = req.headers['x-wallet-signature'] as string
    const encodedMessage = req.headers['x-signed-message'] as string

    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized: No wallet address provided' })
    }

    // Decode the base64-encoded message
    let signedMessage: string
    try {
      signedMessage = Buffer.from(encodedMessage, 'base64').toString('utf-8')
    } catch (error) {
      return res.status(400).json({ error: 'Invalid message encoding' })
    }

    // Verify the signature
    if (!verifyWalletSignature(walletAddress, signature, signedMessage)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Verify message is recent (prevent replay attacks)
    if (!isMessageRecent(signedMessage)) {
      return res.status(401).json({ error: 'Signature expired. Please sign in again.' })
    }

    // Verify the message contains the correct wallet address
    if (!signedMessage.includes(walletAddress)) {
      return res.status(401).json({ error: 'Signature does not match wallet address' })
    }

    switch (req.method) {
      case 'GET':
        return handleGetMessages(req, res, walletAddress)
      case 'POST':
        return handleSendMessage(req, res, walletAddress)
      case 'PUT':
        return handleMarkAsRead(req, res, walletAddress)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * GET /api/chat/messages?other={address}
 * Get conversation with another user
 */
function handleGetMessages(req: NextApiRequest, res: NextApiResponse, walletAddress: string) {
  const { other } = req.query

  if (!other || typeof other !== 'string') {
    return res.status(400).json({ error: 'Missing recipient address' })
  }

  // Get all messages between two users
  const messages = db
    .prepare(
      `
    SELECT * FROM messages
    WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
    ORDER BY timestamp ASC
  `
    )
    .all(walletAddress, other, other, walletAddress)

  return res.status(200).json({
    messages: messages.map((msg: any) => ({
      ...msg,
      read: Boolean(msg.read),
    })),
  })
}

/**
 * POST /api/chat/messages
 * Send a new message
 */
function handleSendMessage(req: NextApiRequest, res: NextApiResponse, walletAddress: string) {
  const { recipient, content } = req.body

  if (!recipient || !content) {
    return res.status(400).json({ error: 'Missing recipient or content' })
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: 'Message too long (max 1000 characters)' })
  }

  if (recipient === walletAddress) {
    return res.status(400).json({ error: 'Cannot message yourself' })
  }

  // Insert message
  const stmt = db.prepare(`
    INSERT INTO messages (sender, recipient, content, timestamp)
    VALUES (?, ?, ?, ?)
  `)

  const timestamp = Date.now()
  const result = stmt.run(walletAddress, recipient, content, timestamp)

  return res.status(201).json({
    message: {
      id: result.lastInsertRowid,
      sender: walletAddress,
      recipient,
      content,
      timestamp,
      read: false,
    },
  })
}

/**
 * PUT /api/chat/messages/:id/read
 * Mark message as read
 */
function handleMarkAsRead(req: NextApiRequest, res: NextApiResponse, walletAddress: string) {
  const { messageId } = req.body

  if (!messageId) {
    return res.status(400).json({ error: 'Missing message ID' })
  }

  // Verify the user is the recipient
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any

  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }

  if (message.recipient !== walletAddress) {
    return res.status(403).json({ error: 'Not authorized to mark this message as read' })
  }

  // Mark as read
  db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(messageId)

  return res.status(200).json({ success: true })
}

/**
 * GET /api/chat/conversations
 * Get all conversations for current user
 */
export async function getConversations(walletAddress: string) {
  const conversations = db
    .prepare(
      `
    SELECT
      CASE
        WHEN sender = ? THEN recipient
        ELSE sender
      END as other_address,
      MAX(timestamp) as last_message_time,
      (SELECT content FROM messages m2
       WHERE (m2.sender = other_address AND m2.recipient = ?)
          OR (m2.sender = ? AND m2.recipient = other_address)
       ORDER BY timestamp DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages m3
       WHERE m3.sender = other_address
         AND m3.recipient = ?
         AND m3.read = 0) as unread_count
    FROM messages
    WHERE sender = ? OR recipient = ?
    GROUP BY other_address
    ORDER BY last_message_time DESC
  `
    )
    .all(walletAddress, walletAddress, walletAddress, walletAddress, walletAddress, walletAddress)

  return conversations
}
