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
  admin:                   'GZnjkdRHBf7T5eSFhS8xyGRobvazAJDfzCFKRSbXzmE9',
  tokenMint:               'So11111111111111111111111111111111111111112',
  proposalCount:           10,
  minProposalStake:        100,
  votingPeriod:            7 * 86400,
  quorumPercentage:        10,
  reputationMultiplier:    1,
  totalProposalsExecuted:  4,
}

function makeSeedProposals(): ProposalData[] {
  const now = Math.floor(Date.now() / 1000)
  return [
    {
      id: 0,
      proposer: 'GZnjkdRHBf7T5eSFhS8xyGRobvazAJDfzCFKRSbXzmE9',
      title: 'Reduce Platform Fee from 2.5% to 2.0%',
      descriptionUri: 'sim://0',
      proposalType: GovernanceProposalType.ParameterChange,
      status: GovernanceProposalStatus.Active,
      votesFor: 1820,
      votesAgainst: 430,
      totalVoters: 14,
      stakeAmount: 100_000_000_000,
      createdAt: now - 2 * 86400,
      votingEndsAt: now + 5 * 86400,
      executed: false,
    },
    {
      id: 1,
      proposer: 'Bm7gMVp3GctzKkX91nXNJJbXLWd1mGbxz54k3AiVDfne',
      title: 'Enable AI-Powered Dispute Resolution Module',
      descriptionUri: 'sim://1',
      proposalType: GovernanceProposalType.FeatureToggle,
      status: GovernanceProposalStatus.Executed,
      votesFor: 3100,
      votesAgainst: 740,
      totalVoters: 22,
      stakeAmount: 100_000_000_000,
      createdAt: now - 15 * 86400,
      votingEndsAt: now - 8 * 86400,
      executed: true,
    },
    {
      id: 2,
      proposer: 'HtqL9DxVQmfHzrnb5gFZvnqkSJqKNJW6rFkFJgAqBLcn',
      title: 'Treasury Grant: 500 SOL for Security Audit',
      descriptionUri: 'sim://2',
      proposalType: GovernanceProposalType.TreasurySpend,
      status: GovernanceProposalStatus.Executed,
      votesFor: 2650,
      votesAgainst: 310,
      totalVoters: 18,
      stakeAmount: 100_000_000_000,
      createdAt: now - 45 * 86400,
      votingEndsAt: now - 38 * 86400,
      executed: true,
    },
    {
      id: 3,
      proposer: 'DPrvPNxXSAwnj3MmGCsVJCAsLJSfhRt7B9K2xvFGnbRu',
      title: 'Elect 3 New Community Arbitrators for Q2',
      descriptionUri: 'sim://3',
      proposalType: GovernanceProposalType.ArbitratorElection,
      status: GovernanceProposalStatus.Active,
      votesFor: 960,
      votesAgainst: 180,
      totalVoters: 9,
      stakeAmount: 100_000_000_000,
      createdAt: now - 1 * 86400,
      votingEndsAt: now + 6 * 86400,
      executed: false,
    },
    {
      id: 4,
      proposer: 'FqVS7E2tNmHgLJZGTQypHpSi2KdMhJfYjjqKJqAamXnk',
      title: 'Emergency Freeze: Pause New Job Postings 24h',
      descriptionUri: 'sim://4',
      proposalType: GovernanceProposalType.EmergencyAction,
      status: GovernanceProposalStatus.Rejected,
      votesFor: 210,
      votesAgainst: 1540,
      totalVoters: 11,
      stakeAmount: 100_000_000_000,
      createdAt: now - 20 * 86400,
      votingEndsAt: now - 13 * 86400,
      executed: false,
    },
    {
      id: 5,
      proposer: 'AYWKAiHjtHVPHHNkAcNZgdmZx3vJMVF1rXKvhXzqmdDB',
      title: 'Increase Arbitrator Reward from 2% to 3%',
      descriptionUri: 'sim://5',
      proposalType: GovernanceProposalType.ParameterChange,
      status: GovernanceProposalStatus.Approved,
      votesFor: 1780,
      votesAgainst: 620,
      totalVoters: 16,
      stakeAmount: 100_000_000_000,
      createdAt: now - 25 * 86400,
      votingEndsAt: now - 18 * 86400,
      executed: false,
    },
    {
      id: 6,
      proposer: 'CRmXqFnwaPTBjd19fNhiUmpKbvbKHmGZNuvTuZLJhWpa',
      title: 'Add Milestone-Based Escrow Release Option',
      descriptionUri: 'sim://6',
      proposalType: GovernanceProposalType.FeatureToggle,
      status: GovernanceProposalStatus.Active,
      votesFor: 2240,
      votesAgainst: 390,
      totalVoters: 17,
      stakeAmount: 100_000_000_000,
      createdAt: now - 3 * 86400,
      votingEndsAt: now + 4 * 86400,
      executed: false,
    },
    {
      id: 7,
      proposer: 'EnXtN8FUvnBcfVRqUbK9pGAZpLkewHc3Xpd9mnZaHBMk',
      title: 'Treasury Grant: 200 SOL for Developer Bounties',
      descriptionUri: 'sim://7',
      proposalType: GovernanceProposalType.TreasurySpend,
      status: GovernanceProposalStatus.Executed,
      votesFor: 1990,
      votesAgainst: 280,
      totalVoters: 13,
      stakeAmount: 100_000_000_000,
      createdAt: now - 60 * 86400,
      votingEndsAt: now - 53 * 86400,
      executed: true,
    },
    {
      id: 8,
      proposer: 'J9M6QeWHRkRfbNyLqm4VmA6ZcTQkgzSDX3wNzqdN1byq',
      title: 'Extend Voting Period from 7 Days to 10 Days',
      descriptionUri: 'sim://8',
      proposalType: GovernanceProposalType.ParameterChange,
      status: GovernanceProposalStatus.QuorumNotMet,
      votesFor: 140,
      votesAgainst: 60,
      totalVoters: 3,
      stakeAmount: 100_000_000_000,
      createdAt: now - 35 * 86400,
      votingEndsAt: now - 28 * 86400,
      executed: false,
    },
    {
      id: 9,
      proposer: 'Km3pVoTjnUFHSewdZxJpNe1YfCkdGBqoHuBaMvnpyVTR',
      title: 'Require SBT Verification for High-Value Job Posts (> 50 SOL)',
      descriptionUri: 'sim://9',
      proposalType: GovernanceProposalType.ParameterChange,
      status: GovernanceProposalStatus.Active,
      votesFor: 870,
      votesAgainst: 510,
      totalVoters: 10,
      stakeAmount: 100_000_000_000,
      createdAt: now - 4 * 86400,
      votingEndsAt: now + 3 * 86400,
      executed: false,
    },
  ]
}

const SEED_DESCRIPTIONS: Record<number, string> = {
  0: `## Summary\n\nReduce the platform fee from the current 2.5% to 2.0% to remain competitive with emerging Web3 freelance platforms.\n\n## Motivation\n\nSince launch, several competing platforms have introduced lower fee structures. A 2.0% fee still maintains sustainable revenue while improving the value proposition for clients and freelancers alike.\n\n## Implementation\n\nThe feePercentage field in the PlatformConfig account would be updated from 250 to 200 basis points via a governance-approved admin transaction.\n\n## Expected Impact\n\n- Estimated 15-20% increase in job postings due to improved platform economics\n- Freelancers retain more earnings per contract\n- Platform remains financially sustainable at the reduced rate\n\n## Success Metrics\n\n30-day job post volume increase of at least 10% post-implementation.`,

  1: `## Summary\n\nActivate the AI verification oracle module for preliminary dispute evidence analysis, allowing faster and more consistent dispute resolution.\n\n## Motivation\n\nDispute resolution currently relies entirely on human arbitrators who average 72 hours response time. The AI oracle module (already deployed at the program level) can provide instant preliminary assessments to help arbitrators make faster, more consistent decisions.\n\n## Implementation\n\n1. Enable the oracle scoring endpoints in the dispute program\n2. Integrate oracle confidence scores into the arbitration weighting algorithm (advisory only)\n3. Human arbitrators retain final decision authority in all cases\n4. Oracle recommendations logged on-chain for audit\n\n## Expected Impact\n\n- Average dispute resolution from 72 hours → 24 hours\n- More consistent scoring criteria across similar cases\n- Reduced arbitrator cognitive load\n\n**STATUS: Executed successfully on-chain.**`,

  2: `## Summary\n\nRequest 500 SOL from the DAO treasury to fund an independent security audit of the escrow and dispute programs.\n\n## Background\n\nBefore expanding to mainnet, a professional third-party audit is required to verify the escrow logic, PDA derivation safety, and reentrancy protections. Two audit firms (Halborn Security and OtterSec) have submitted quotes in the 400–600 SOL range.\n\n## Budget Breakdown\n\n- Audit firm engagement: 480 SOL\n- Buffer for follow-up remediation support: 20 SOL\n\n## Deliverables\n\n- Full audit report published on-chain and on GitHub\n- Verified clean bill on escrow + dispute programs\n- Optional bug bounty coordination post-audit\n\n**STATUS: Executed. Audit report available at github.com/freelancechain/audit-q1.**`,

  3: `## Summary\n\nElect three new community arbitrators to serve during Q2 to handle the growing volume of disputes.\n\n## Motivation\n\nWith job volume increasing 40% quarter-over-quarter, the current arbitrator pool is under-resourced. Three new qualified arbitrators would bring average resolution time from 48h to under 20h.\n\n## Candidate Requirements\n\n- Minimum rating: 4.5/5.0\n- Minimum completed jobs: 20\n- Active on-chain reputation for at least 90 days\n\n## Nominated Candidates\n\n1. **GZnjk...zmE9** — Solana developer, 4.8 rating, 51 completed jobs\n2. **Bm7gM...Dfne** — Design specialist, 4.7 rating, 38 completed jobs\n3. **HtqL9...Lcn** — Smart contract auditor, 4.9 rating, 29 completed jobs\n\n## Term\n\nQ2 2025 (90 days), renewable by DAO vote.`,

  4: `## Summary\n\nThis emergency proposal requested a 24-hour pause on new job postings following a suspected oracle manipulation incident on March 3rd.\n\n## Background\n\nAn anomalous pricing suggestion was returned by the AI pricing oracle for 3 consecutive high-value jobs. The proposer requested a pause to investigate.\n\n## Community Response\n\nAfter community review, it was determined the anomaly was due to a temporary Pyth price feed delay, not an oracle exploit. The proposal was **rejected** to maintain platform continuity.\n\n## Outcome\n\nPyth feed fallback logic was added as a parameter-change in a separate proposal. No funds were at risk.`,

  5: `## Summary\n\nIncrease the arbitrator reward percentage from 2% to 3% of the disputed escrow amount to better incentivize high-quality arbitration.\n\n## Motivation\n\nAt the current 2% rate, arbitrating small disputes (< 1 SOL) yields negligible rewards. Raising to 3% improves incentive alignment for all dispute sizes and reduces arbitrator drop-off rates.\n\n## Implementation\n\nUpdate the arbitratorRewardBps field in PlatformConfig from 200 to 300 basis points.\n\n## Expected Impact\n\n- 30% increase in arbitrator participation rate\n- Faster dispute resolution for sub-1 SOL cases\n- Improved satisfaction scores for dispute parties\n\n**STATUS: Approved. Awaiting execution.**`,

  6: `## Summary\n\nAdd an optional milestone-based escrow release mode for job postings, allowing clients to release partial payments as milestones are completed.\n\n## Motivation\n\nMany complex projects (web development, design systems, research) benefit from staged payments. Currently, the protocol only supports full escrow locking until job completion, which discourages large long-form projects.\n\n## Design\n\n- Client defines 2–5 milestones with SOL amounts and deliverables at job creation\n- Each milestone has an independent escrow sub-account\n- Freelancer submits work per milestone; client approves/rejects each independently\n- Dispute can be raised at any milestone stage\n\n## Implementation\n\nNew Anchor instruction: initializeMilestone, completeMilestone, disputeMilestone — all gated behind FeatureFlag::MilestoneEscrow.\n\n## Timeline\n\nProposed activation: 30 days after governance approval.`,

  7: `## Summary\n\nRequest 200 SOL from the DAO treasury to fund a developer bounty program for the first half of 2025.\n\n## Motivation\n\nAttracting external Anchor/Solana developers to contribute protocol improvements requires concrete financial incentives. A structured bounty program lowers the barrier for community contributions.\n\n## Budget Allocation\n\n- Critical bug bounties (up to 50 SOL per issue): 100 SOL\n- Feature contribution bounties: 70 SOL\n- Documentation and SDK contributions: 30 SOL\n\n## Governance\n\nBounty assignments approved by 2-of-3 core team multisig. Results published publicly.\n\n**STATUS: Executed. Bounty board live at github.com/freelancechain/bounties.**`,

  8: `## Summary\n\nExtend the DAO voting period from 7 days to 10 days to allow more community members to participate.\n\n## Motivation\n\nSeveral community members reported missing active votes due to time zone and schedule constraints. A 10-day window improves global inclusivity.\n\n## Concern\n\nCritics noted that a longer voting period slows emergency governance response. The proposal did not reach quorum (only 3 voters participated) and was marked QuorumNotMet.\n\n## Next Steps\n\nA revised proposal with a tiered voting period (7 days standard, 3 days emergency) is being drafted.`,

  9: `## Summary\n\nRequire SBT (Soul-Bound Token) identity verification for any job posting with a budget exceeding 50 SOL.\n\n## Motivation\n\nHigh-value job scams have been reported on competing platforms. Requiring on-chain KYC for large postings deters fraudulent clients while maintaining permissionless access for normal jobs.\n\n## Implementation\n\n- Add a budget_threshold parameter to PlatformConfig (default: 50 SOL)\n- During createJob, if budget > threshold, check that client holds a valid SBT\n- SBT validity determined by the existing KYC program (face distance < 0.50)\n\n## Expected Impact\n\n- Near-elimination of large job scam attempts\n- SBT adoption incentive for serious clients\n- No impact on the majority of jobs (< 50 SOL budget)`,
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
