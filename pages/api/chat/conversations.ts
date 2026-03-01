import type { NextApiRequest, NextApiResponse } from 'next'
import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'chat.db')
const db = new Database(dbPath)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const walletAddress = req.headers.authorization?.replace('Bearer ', '')

    if (!walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get all unique conversation partners
    const rows = db
      .prepare(
        `
        SELECT DISTINCT
          CASE
            WHEN sender = ? THEN recipient
            ELSE sender
          END as other_address
        FROM messages
        WHERE sender = ? OR recipient = ?
        `
      )
      .all(walletAddress, walletAddress, walletAddress) as Array<{ other_address: string }>

    // Get details for each conversation
    const conversations = rows.map((row) => {
      const other = row.other_address

      // Get last message
      const lastMsg = db
        .prepare(
          `
          SELECT content, timestamp
          FROM messages
          WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
          ORDER BY timestamp DESC
          LIMIT 1
          `
        )
        .get(walletAddress, other, other, walletAddress) as
        | { content: string; timestamp: number }
        | undefined

      // Get unread count
      const unreadRow = db
        .prepare(
          `
          SELECT COUNT(*) as count
          FROM messages
          WHERE sender = ? AND recipient = ? AND read = 0
          `
        )
        .get(other, walletAddress) as { count: number }

      return {
        other_address: other,
        last_message: lastMsg?.content || null,
        last_message_time: lastMsg?.timestamp || null,
        unread_count: unreadRow.count,
      }
    })

    // Sort by last message time
    conversations.sort((a, b) => {
      const timeA = a.last_message_time || 0
      const timeB = b.last_message_time || 0
      return timeB - timeA
    })

    return res.status(200).json({ conversations })
  } catch (error) {
    console.error('Conversations API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
