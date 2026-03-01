/**
 * Devnet DAO governance simulator
 *
 * Persists proposals, votes, and config in localStorage.
 * Seeds with realistic sample proposals on first load.
 */

import type { DAOConfigData, ProposalData } from '../types'
import { GovernanceProposalStatus, GovernanceProposalType } from '../types'

// ─── Storage keys ─────────────────────────────────────────────────────────────

const PROPOSALS_KEY = 'governance_sim_proposals'
const CONFIG_KEY    = 'governance_sim_config'
const DESC_KEY      = (id: number) => `governance_sim_desc_${id}`
const VOTES_KEY     = (id: number) => `governance_sim_votes_${id}`

function fakeSig(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  return Array.from({ length: 88 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── Default / seed data ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: DAOConfigData = {
  admin:                   'SimAdmin1111111111111111111111111111111111111',
  tokenMint:               'SimToken1111111111111111111111111111111111111',
  proposalCount:           3,
  minProposalStake:        100,
  votingPeriod:            7 * 86400,   // 7 days
  quorumPercentage:        10,
  reputationMultiplier:    1,
  totalProposalsExecuted:  1,
}

function makeSeedProposals(): ProposalData[] {
  const now = Math.floor(Date.now() / 1000)
  return [
    {
      id: 0,
      proposer: 'SimUser1111111111111111111111111111111111111',
      title: 'Reduce Platform Fee from 2.5% to 2.0%',
      descriptionUri: 'sim://0',
      proposalType: GovernanceProposalType.ParameterChange,
      status: GovernanceProposalStatus.Active,
      votesFor: 1250,
      votesAgainst: 380,
      totalVoters: 8,
      stakeAmount: 100_000_000_000,
      createdAt: now - 2 * 86400,
      votingEndsAt: now + 5 * 86400,
      executed: false,
    },
    {
      id: 1,
      proposer: 'SimUser2222222222222222222222222222222222222',
      title: 'Enable AI-Powered Dispute Resolution Module',
      descriptionUri: 'sim://1',
      proposalType: GovernanceProposalType.FeatureToggle,
      status: GovernanceProposalStatus.Approved,
      votesFor: 2100,
      votesAgainst: 800,
      totalVoters: 15,
      stakeAmount: 100_000_000_000,
      createdAt: now - 15 * 86400,
      votingEndsAt: now - 8 * 86400,
      executed: false,
    },
    {
      id: 2,
      proposer: 'SimUser3333333333333333333333333333333333333',
      title: 'Treasury Grant: $10K for Frontend Redesign',
      descriptionUri: 'sim://2',
      proposalType: GovernanceProposalType.TreasurySpend,
      status: GovernanceProposalStatus.Rejected,
      votesFor: 400,
      votesAgainst: 900,
      totalVoters: 9,
      stakeAmount: 100_000_000_000,
      createdAt: now - 30 * 86400,
      votingEndsAt: now - 23 * 86400,
      executed: false,
    },
  ]
}

const SEED_DESCRIPTIONS: Record<number, string> = {
  0: `## Summary\n\nReduce the platform fee from the current 2.5% to 2.0% to remain competitive with emerging Web3 freelance platforms.\n\n## Motivation\n\nSince launch, several competing platforms have introduced lower fee structures. A 2.0% fee still maintains sustainable revenue while improving the value proposition for clients and freelancers alike.\n\n## Implementation\n\nThe feePercentage field in the PlatformConfig account would be updated from 250 to 200 basis points via a governance-approved admin transaction.\n\n## Expected Impact\n\n- Estimated 15-20% increase in job postings due to improved platform economics\n- Freelancers retain more earnings per contract\n- Platform remains financially sustainable at the reduced rate\n\n## Success Metrics\n\n30-day job post volume increase of at least 10% post-implementation.`,

  1: `## Summary\n\nActivate the AI verification oracle module for preliminary dispute evidence analysis, allowing faster and more consistent dispute resolution.\n\n## Motivation\n\nDispute resolution currently relies entirely on human arbitrators who average 72 hours response time. The AI oracle module (already deployed at the program level) can provide instant preliminary assessments to help arbitrators make faster, more consistent decisions.\n\n## Implementation\n\n1. Enable the oracle scoring endpoints in the dispute program\n2. Integrate oracle confidence scores into the arbitration weighting algorithm (advisory only)\n3. Human arbitrators retain final decision authority in all cases\n4. Oracle recommendations logged on-chain for audit\n\n## Expected Impact\n\n- Average dispute resolution from 72 hours → 24 hours\n- More consistent scoring criteria across similar cases\n- Reduced arbitrator cognitive load`,

  2: `## Summary\n\nRequest 10,000 USDC from the DAO treasury to fund a professional UI/UX redesign of the platform frontend.\n\n## Background\n\nUser research across 50 beta users revealed significant usability friction in the job listing, bidding, and escrow flows — estimated to cause 40% drop-off.\n\n## Budget Breakdown\n\n- Senior UI/UX Designer (contract, 6 weeks): $6,000\n- Frontend Developer implementation: $3,000\n- User testing sessions (3 rounds): $1,000\n\n## Deliverables\n\n- Updated design system compatible with current MUI theme\n- Redesigned job listing page with improved filtering\n- Mobile-responsive bid submission flow\n- Handoff assets and design documentation\n\n## Risk\n\nThis proposal was rejected due to concerns about treasury reserves and lack of a competitive contractor selection process.`,
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let seeded = false

function initIfNeeded() {
  if (typeof window === 'undefined') return
  if (seeded) return

  if (!localStorage.getItem(PROPOSALS_KEY)) {
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify(makeSeedProposals()))
    for (const [id, desc] of Object.entries(SEED_DESCRIPTIONS)) {
      localStorage.setItem(DESC_KEY(Number(id)), desc)
    }
  }
  if (!localStorage.getItem(CONFIG_KEY)) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
  }
  seeded = true
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export function getSimDAOConfig(): DAOConfigData {
  if (typeof window === 'undefined') return DEFAULT_CONFIG
  initIfNeeded()
  const raw = localStorage.getItem(CONFIG_KEY)
  return raw ? JSON.parse(raw) : DEFAULT_CONFIG
}

export function getSimProposals(): ProposalData[] {
  if (typeof window === 'undefined') return makeSeedProposals()
  initIfNeeded()
  const raw = localStorage.getItem(PROPOSALS_KEY)
  return raw ? JSON.parse(raw) : makeSeedProposals()
}

export function getSimProposal(id: number): ProposalData | null {
  return getSimProposals().find(p => p.id === id) ?? null
}

export function getSimDescription(id: number): string {
  if (typeof window === 'undefined') return SEED_DESCRIPTIONS[id] ?? ''
  initIfNeeded()
  return localStorage.getItem(DESC_KEY(id)) ?? SEED_DESCRIPTIONS[id] ?? ''
}

// ─── Vote tracking ─────────────────────────────────────────────────────────────

export interface SimVote {
  voter: string
  voteFor: boolean
  weight: number
  votedAt: number
}

export function getSimVotes(proposalId: number): SimVote[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(VOTES_KEY(proposalId))
  return raw ? JSON.parse(raw) : []
}

export function hasVoted(proposalId: number, voter: string): boolean {
  return getSimVotes(proposalId).some(v => v.voter === voter)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveProposals(proposals: ProposalData[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals))
}

function saveConfig(config: DAOConfigData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function simCreateProposal(
  proposer: string,
  title: string,
  description: string,       // actual text, stored in localStorage
  proposalType: number,
): Promise<{ sig: string; proposalId: number }> {
  await new Promise(r => setTimeout(r, 1400))
  initIfNeeded()

  const config = getSimDAOConfig()
  const proposalId = config.proposalCount
  const now = Math.floor(Date.now() / 1000)

  const proposal: ProposalData = {
    id: proposalId,
    proposer,
    title,
    descriptionUri: `sim://${proposalId}`,
    proposalType,
    status: GovernanceProposalStatus.Active,
    votesFor: 0,
    votesAgainst: 0,
    totalVoters: 0,
    stakeAmount: config.minProposalStake * 1_000_000_000,
    createdAt: now,
    votingEndsAt: now + config.votingPeriod,
    executed: false,
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(DESC_KEY(proposalId), description)
  }

  const proposals = getSimProposals()
  proposals.push(proposal)
  saveProposals(proposals)

  config.proposalCount += 1
  saveConfig(config)

  return { sig: fakeSig(), proposalId }
}

export async function simCastVote(
  voter: string,
  proposalId: number,
  voteFor: boolean,
  weight: number,
): Promise<string> {
  initIfNeeded()

  if (hasVoted(proposalId, voter)) {
    throw new Error('You have already voted on this proposal.')
  }

  const proposals = getSimProposals()
  const proposal = proposals.find(p => p.id === proposalId)
  if (!proposal) throw new Error('Proposal not found.')
  if (proposal.status !== GovernanceProposalStatus.Active) {
    throw new Error('Voting is not active for this proposal.')
  }
  const now = Math.floor(Date.now() / 1000)
  if (now > proposal.votingEndsAt) {
    throw new Error('Voting period has ended. Use Finalize Proposal to tally votes.')
  }

  await new Promise(r => setTimeout(r, 1000))

  const votes = getSimVotes(proposalId)
  votes.push({ voter, voteFor, weight, votedAt: now })
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOTES_KEY(proposalId), JSON.stringify(votes))
  }

  if (voteFor) {
    proposal.votesFor += weight
  } else {
    proposal.votesAgainst += weight
  }
  proposal.totalVoters += 1

  saveProposals(proposals)
  return fakeSig()
}

export async function simFinalizeProposal(proposalId: number): Promise<string> {
  initIfNeeded()

  const proposals = getSimProposals()
  const proposal = proposals.find(p => p.id === proposalId)
  if (!proposal) throw new Error('Proposal not found.')
  if (proposal.status !== GovernanceProposalStatus.Active) {
    throw new Error('Only active proposals can be finalized.')
  }

  await new Promise(r => setTimeout(r, 1000))

  const totalVotes = proposal.votesFor + proposal.votesAgainst
  if (totalVotes === 0) {
    proposal.status = GovernanceProposalStatus.QuorumNotMet
  } else if (proposal.votesFor > proposal.votesAgainst) {
    proposal.status = GovernanceProposalStatus.Approved
  } else {
    proposal.status = GovernanceProposalStatus.Rejected
  }

  saveProposals(proposals)
  return fakeSig()
}

export async function simExecuteProposal(proposalId: number): Promise<string> {
  initIfNeeded()

  const proposals = getSimProposals()
  const proposal = proposals.find(p => p.id === proposalId)
  if (!proposal) throw new Error('Proposal not found.')
  if (proposal.status !== GovernanceProposalStatus.Approved) {
    throw new Error('Only approved proposals can be executed.')
  }

  await new Promise(r => setTimeout(r, 1200))

  proposal.status = GovernanceProposalStatus.Executed
  proposal.executed = true
  saveProposals(proposals)

  const config = getSimDAOConfig()
  config.totalProposalsExecuted += 1
  saveConfig(config)

  return fakeSig()
}
