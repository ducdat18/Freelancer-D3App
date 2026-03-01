/**
 * Bid scoring + anti-manipulation utilities
 *
 * Score: 0-100
 *   Price component  : 0-60 pts (lower price within valid range = higher score)
 *   Timeline component: 0-40 pts (shorter timeline = higher score)
 *
 * Anti-manipulation rules:
 *   - Minimum bid: MIN_BID_RATIO × jobBudget  (hard block)
 *   - Maximum bid: MAX_BID_RATIO × jobBudget  (hard block)
 *   - Warning low : LOW_WARN_RATIO × jobBudget
 *   - Warning high: HIGH_WARN_RATIO × jobBudget
 */

export const MIN_BID_RATIO  = 0.25   // < 25%  of budget → blocked
export const LOW_WARN_RATIO = 0.5    // < 50%  of budget → suspicious warning
export const HIGH_WARN_RATIO= 1.5   // > 150% of budget → over-budget warning
export const MAX_BID_RATIO  = 2.0   // > 200% of budget → blocked

export const MIN_TIMELINE_DAYS = 1
export const MAX_TIMELINE_DAYS = 365

// ─── score calculation ─────────────────────────────────────────────────────

export function calcBidScore(
  bidSol: number,
  budgetSol: number,
  timelineDays: number,
): number {
  if (!budgetSol || budgetSol <= 0) return 0

  // — Price component (0–60) ———————————————————————————
  const ratio = bidSol / budgetSol          // e.g. 0.8 = 80% of budget
  let priceScore: number

  if (ratio <= 0) {
    priceScore = 0
  } else if (ratio <= 1) {
    // 25%→100% of budget: score scales from 60 down to 30
    // At 100% of budget: 30 pts; at MIN_BID_RATIO: up to 60 pts
    priceScore = 30 + (1 - ratio) / (1 - MIN_BID_RATIO) * 30
  } else {
    // 100%→200% of budget: score scales from 30 down to 0
    priceScore = Math.max(0, 30 - (ratio - 1) / (MAX_BID_RATIO - 1) * 30)
  }

  // — Timeline component (0–40) ————————————————————————
  const days = Math.max(MIN_TIMELINE_DAYS, Math.min(timelineDays, 180))
  // 1 day = 40 pts; 180 days = 0 pts (linear)
  const timelineScore = 40 * (1 - (days - 1) / (180 - 1))

  return Math.round(Math.min(100, Math.max(0, priceScore + timelineScore)))
}

// ─── color coding ─────────────────────────────────────────────────────────

export type ScoreLevel = 'strong' | 'average' | 'weak'

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 65) return 'strong'
  if (score >= 40) return 'average'
  return 'weak'
}

export const SCORE_COLORS: Record<ScoreLevel, string> = {
  strong:  '#00ffc3',
  average: '#e04d01',
  weak:    '#ff00ff',
}

// ─── validation ───────────────────────────────────────────────────────────

export interface BidValidation {
  blocked: boolean
  blockReason?: string
  warnings: string[]
}

export function validateBid(
  bidSol: number,
  budgetSol: number,
  timelineDays: number,
): BidValidation {
  const warnings: string[] = []
  const minSol = budgetSol * MIN_BID_RATIO
  const maxSol = budgetSol * MAX_BID_RATIO

  // Hard blocks
  if (bidSol < minSol) {
    return {
      blocked: true,
      blockReason: `Minimum bid is ${minSol.toFixed(3)} SOL (${MIN_BID_RATIO * 100}% of budget). Unrealistically low bids are blocked to protect job quality.`,
      warnings: [],
    }
  }
  if (bidSol > maxSol) {
    return {
      blocked: true,
      blockReason: `Maximum bid is ${maxSol.toFixed(3)} SOL (${MAX_BID_RATIO * 100}% of budget). Please stay within a reasonable range.`,
      warnings: [],
    }
  }
  if (timelineDays < MIN_TIMELINE_DAYS) {
    return { blocked: true, blockReason: 'Minimum timeline is 1 day.', warnings: [] }
  }
  if (timelineDays > MAX_TIMELINE_DAYS) {
    return { blocked: true, blockReason: 'Maximum timeline is 365 days.', warnings: [] }
  }

  // Soft warnings
  if (bidSol < budgetSol * LOW_WARN_RATIO) {
    warnings.push(
      `Your bid is ${Math.round((bidSol / budgetSol) * 100)}% of the posted budget. Ensure this realistically covers the work — lowball bids risk disputes.`
    )
  }
  if (bidSol > budgetSol * HIGH_WARN_RATIO) {
    warnings.push(
      `Your bid exceeds the client's budget by ${Math.round((bidSol / budgetSol - 1) * 100)}%. This may reduce your chances significantly.`
    )
  }
  if (timelineDays <= 2 && budgetSol > 1) {
    warnings.push('Very short timeline detected. Make sure you can realistically deliver in time.')
  }

  return { blocked: false, warnings }
}

// ─── ranking ─────────────────────────────────────────────────────────────

export interface ScoredBid<T> {
  bid: T
  score: number
  rank: number
}

export function rankBids<T extends { budgetInSol: number; account: { timelineDays: number } }>(
  bids: T[],
  jobBudgetSol: number,
): ScoredBid<T>[] {
  const scored = bids.map(bid => ({
    bid,
    score: calcBidScore(bid.budgetInSol, jobBudgetSol, bid.account.timelineDays),
    rank: 0,
  }))
  scored.sort((a, b) => b.score - a.score)
  scored.forEach((s, i) => { s.rank = i + 1 })
  return scored
}
