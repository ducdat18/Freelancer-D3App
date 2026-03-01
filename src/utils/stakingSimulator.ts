/**
 * Devnet staking simulator
 *
 * Persists staking state in localStorage so it survives page reloads.
 * Rewards accrue in real-time based on the APR for the chosen lock period.
 */

import type { PlatformConfig, TokenStakeData } from '../types'

// ─── APR table ────────────────────────────────────────────────────────────────

export const LOCK_PERIOD_CONFIGS = [
  { label: '1 Week',    seconds: 7   * 86400, apr: 0.05 },
  { label: '1 Month',   seconds: 30  * 86400, apr: 0.10 },
  { label: '3 Months',  seconds: 90  * 86400, apr: 0.20 },
  { label: '6 Months',  seconds: 180 * 86400, apr: 0.40 },
] as const

export function getAPRForLockPeriod(lockPeriodSecs: number): number {
  return LOCK_PERIOD_CONFIGS.find(c => c.seconds === lockPeriodSecs)?.apr ?? 0.05
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const STAKE_KEY    = (pk: string) => `staking_sim_stake_${pk}`
const PLATFORM_KEY = 'staking_sim_platform'
const HISTORY_KEY  = (pk: string) => `staking_sim_hist_${pk}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fakeSig(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  return Array.from({ length: 88 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Rewards accrued since last claim (not yet added to accumulatedRewards in storage) */
function calcAccrued(stake: TokenStakeData): number {
  const now = Math.floor(Date.now() / 1000)
  const elapsed = Math.max(0, now - stake.lastClaimed)
  const lockPeriod = Math.max(1, stake.lockUntil - stake.stakedAt)
  const apr = getAPRForLockPeriod(lockPeriod)
  return Math.floor(stake.amount * apr * (elapsed / (365 * 86400)))
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getSimStake(pubkey: string): TokenStakeData | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STAKE_KEY(pubkey))
  if (!raw) return null
  const stake: TokenStakeData = JSON.parse(raw)
  // Inject live accrued rewards without touching storage
  return { ...stake, accumulatedRewards: stake.accumulatedRewards + calcAccrued(stake) }
}

/** Precise real-time accrual rate in base-units per second (for live ticker) */
export function getLiveAccrualPerSecond(stake: TokenStakeData): number {
  const lockPeriod = Math.max(1, stake.lockUntil - stake.stakedAt)
  const apr = getAPRForLockPeriod(lockPeriod)
  return stake.amount * apr / (365 * 86400)
}

const DEFAULT_PLATFORM: PlatformConfig = {
  admin:               'SimAdmin1111111111111111111111111111111111111',
  tokenMint:           'SimToken1111111111111111111111111111111111111',
  treasury:            'SimTreasury11111111111111111111111111111111111',
  totalStaked:         42_000_000_000,  // 42 GVT already "staked" by simulated users
  feePercentage:       250,             // 2.5%
  buybackPercentage:   5000,            // 50% of fees → buyback+burn
  accumulatedFees:     1_500_000_000,
  totalFeesCollected:  25_000_000_000,
  totalBurned:         5_000_000_000,
  lastDistribution:    Math.floor(Date.now() / 1000) - 3600,
}

export function getSimPlatformConfig(): PlatformConfig {
  if (typeof window === 'undefined') return DEFAULT_PLATFORM
  const raw = localStorage.getItem(PLATFORM_KEY)
  if (raw) return JSON.parse(raw)
  localStorage.setItem(PLATFORM_KEY, JSON.stringify(DEFAULT_PLATFORM))
  return DEFAULT_PLATFORM
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface TxHistoryEntry {
  type: 'stake' | 'unstake' | 'claim'
  amount: number
  timestamp: number
  sig: string
}

export function getSimHistory(pubkey: string): TxHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(HISTORY_KEY(pubkey))
  return raw ? JSON.parse(raw) : []
}

function pushHistory(pubkey: string, entry: TxHistoryEntry) {
  if (typeof window === 'undefined') return
  const history = getSimHistory(pubkey)
  history.unshift(entry)
  localStorage.setItem(HISTORY_KEY(pubkey), JSON.stringify(history.slice(0, 20)))
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function simStakeTokens(
  pubkey: string,
  amount: number,
  lockPeriodSecs: number,
): Promise<string> {
  // Simulate network latency
  await new Promise(r => setTimeout(r, 1400))

  const now = Math.floor(Date.now() / 1000)
  const existing = getSimStake(pubkey)

  const stake: TokenStakeData = {
    user: pubkey,
    amount: (existing?.amount ?? 0) + amount,
    stakedAt: now,
    lastClaimed: now,
    lockUntil: now + lockPeriodSecs,
    // keep any existing accumulated rewards
    accumulatedRewards: existing
      ? existing.accumulatedRewards - calcAccrued(existing) // already baked into existing.accumulatedRewards
      : 0,
  }
  // Re-read raw to avoid double-counting the live accrual
  const rawExisting = localStorage.getItem(STAKE_KEY(pubkey))
  const parsedExisting: TokenStakeData | null = rawExisting ? JSON.parse(rawExisting) : null
  const savedStake: TokenStakeData = {
    user: pubkey,
    amount: (parsedExisting?.amount ?? 0) + amount,
    stakedAt: now,
    lastClaimed: now,
    lockUntil: now + lockPeriodSecs,
    accumulatedRewards: parsedExisting
      ? parsedExisting.accumulatedRewards + calcAccrued(parsedExisting)
      : 0,
  }
  localStorage.setItem(STAKE_KEY(pubkey), JSON.stringify(savedStake))

  const config = getSimPlatformConfig()
  config.totalStaked += amount
  localStorage.setItem(PLATFORM_KEY, JSON.stringify(config))

  const sig = fakeSig()
  pushHistory(pubkey, { type: 'stake', amount, timestamp: now, sig })
  return sig
}

export async function simUnstakeTokens(pubkey: string): Promise<string> {
  const stake = getSimStake(pubkey)
  if (!stake || stake.amount === 0) throw new Error('No active stake found')
  const now = Math.floor(Date.now() / 1000)
  if (stake.lockUntil > now) throw new Error('Tokens are still locked')

  await new Promise(r => setTimeout(r, 1000))

  const config = getSimPlatformConfig()
  config.totalStaked = Math.max(0, config.totalStaked - stake.amount)
  localStorage.setItem(PLATFORM_KEY, JSON.stringify(config))

  const sig = fakeSig()
  pushHistory(pubkey, { type: 'unstake', amount: stake.amount, timestamp: now, sig })
  localStorage.removeItem(STAKE_KEY(pubkey))
  return sig
}

export async function simClaimRewards(pubkey: string): Promise<{ sig: string; claimed: number }> {
  const stake = getSimStake(pubkey)
  if (!stake || stake.accumulatedRewards === 0) throw new Error('No rewards to claim')

  await new Promise(r => setTimeout(r, 900))

  const now = Math.floor(Date.now() / 1000)
  const claimed = stake.accumulatedRewards
  const updated: TokenStakeData = { ...stake, lastClaimed: now, accumulatedRewards: 0 }
  localStorage.setItem(STAKE_KEY(pubkey), JSON.stringify(updated))

  const sig = fakeSig()
  pushHistory(pubkey, { type: 'claim', amount: claimed, timestamp: now, sig })
  return { sig, claimed }
}
