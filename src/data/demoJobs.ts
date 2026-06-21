/**
 * Demo job listings injected client-side to make the platform look populated.
 * These merge with real on-chain jobs; real jobs always take priority.
 * Uses plain numbers for BN fields (bnToNumber handles both BN and number).
 */
import { PublicKey } from '@solana/web3.js';

/** Build a deterministic but unique-looking PublicKey from a seed integer */
function pk(n: number): PublicKey {
  const b = new Uint8Array(32);
  b[0]  = (n * 127) & 0xff;  b[1]  = (n * 53)  & 0xff;
  b[2]  = (n * 17)  & 0xff;  b[3]  = (n * 97)  & 0xff;
  b[4]  = (n * 37)  & 0xff;  b[5]  = ((n+5)*11) & 0xff;
  b[6]  = ((n+2)*31) & 0xff; b[7]  = ((n+11)*7) & 0xff;
  b[8]  = (n * 61)  & 0xff;  b[9]  = ((n+3)*19) & 0xff;
  b[10] = (n * 43)  & 0xff;  b[11] = ((n+7)*23) & 0xff;
  return new PublicKey(b);
}

/** Client wallet seeds: 50–74 (job keys: 1–25) */
const NOW = Math.floor(Date.now() / 1000);
const D = 86400; // 1 day in seconds
const SOL = 1_000_000_000;

export interface DemoJob {
  publicKey: PublicKey;
  account: {
    client: PublicKey;
    title: string;
    description: string;
    budget: number;       // lamports as number — bnToNumber handles it
    metadataUri: string;
    status: { open: Record<string, never> };
    selectedFreelancer: null;
    createdAt: number;    // Unix timestamp — bnToNumber handles it
    updatedAt: number;
    bidCount: number;
    escrowAmount: number;
  };
  isDemo: true;
  tags: string[];
  category: string;
}

export const DEMO_JOBS: DemoJob[] = [
  // ── Solana / Rust Development ────────────────────────────────────────────────
  {
    publicKey: pk(1), isDemo: true, category: 'development', tags: ['Rust', 'Anchor', 'DeFi', 'Solana'],
    account: {
      client: pk(51), title: 'DEX Aggregator Smart Contract on Solana',
      description: 'Build a high-performance DEX aggregator program in Rust/Anchor that routes trades across Orca, Raydium, and Meteora. Must handle slippage protection, partial fills, and atomic swaps. Experience with Solana CPI required.',
      budget: Math.round(8.5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 2*D, updatedAt: NOW - 2*D, bidCount: 11, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(2), isDemo: true, category: 'development', tags: ['Rust', 'Anchor', 'NFT', 'Metaplex'],
    account: {
      client: pk(52), title: 'NFT Marketplace Smart Contracts (Rust/Anchor)',
      description: 'Develop a full-featured NFT marketplace program: listing, bidding, royalties, and lazy minting. Integrate with Metaplex Token Metadata standard. Comprehensive test suite required. Prior NFT contract experience essential.',
      budget: Math.round(7 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 4*D, updatedAt: NOW - 4*D, bidCount: 8, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(3), isDemo: true, category: 'development', tags: ['Rust', 'DeFi', 'Staking', 'Anchor'],
    account: {
      client: pk(53), title: 'Liquid Staking Protocol — Solana Anchor Program',
      description: 'Implement a liquid staking pool where users stake SOL and receive yield-bearing tokens (like stSOL). Needs epoch-based reward distribution, unstake queue, and slashing protection. Looking for a top-tier Rust developer.',
      budget: Math.round(11 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 1*D, updatedAt: NOW - 1*D, bidCount: 5, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(4), isDemo: true, category: 'development', tags: ['Rust', 'Cross-Chain', 'Bridge', 'Wormhole'],
    account: {
      client: pk(54), title: 'Cross-Chain Asset Bridge — Wormhole Integration',
      description: 'Integrate Wormhole messaging into our existing Solana program to enable two-way asset bridging to Ethereum and BNB Chain. Need deep understanding of VAAs, guardian sets, and finality guarantees across chains.',
      budget: Math.round(14 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 6*D, updatedAt: NOW - 6*D, bidCount: 4, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(5), isDemo: true, category: 'development', tags: ['DAO', 'Governance', 'Anchor', 'SPL'],
    account: {
      client: pk(55), title: 'On-chain DAO Governance Program with SPL Token Voting',
      description: 'Create a governance program where SPL token holders propose and vote on protocol changes. Features: quorum rules, time-locks, veto power, multi-sig treasury. Full Anchor implementation with client SDK.',
      budget: Math.round(5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 3*D, updatedAt: NOW - 3*D, bidCount: 13, escrowAmount: 0,
    },
  },

  // ── Frontend / Web3 Development ──────────────────────────────────────────────
  {
    publicKey: pk(6), isDemo: true, category: 'development', tags: ['React', 'TypeScript', 'DeFi', 'Chart.js'],
    account: {
      client: pk(56), title: 'DeFi Portfolio Dashboard with Real-Time Price Feeds',
      description: 'Build a React dashboard that tracks multi-wallet SOL/SPL balances, DeFi positions across Orca/Raydium, and PnL history with Chart.js visualizations. WebSocket integration for live price updates. TypeScript required.',
      budget: Math.round(3.5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 1*D, updatedAt: NOW - 1*D, bidCount: 22, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(7), isDemo: true, category: 'development', tags: ['Next.js', 'React', 'NFT', 'Wallet Adapter'],
    account: {
      client: pk(57), title: 'NFT Minting dApp — Next.js + Candy Machine v3',
      description: 'Build a polished NFT minting site with Metaplex Candy Machine v3. Features: countdown timer, whitelist gating, multi-wallet support, mobile responsive. Needs mint progress animation and transaction confirmation UI.',
      budget: Math.round(2.8 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 5*D, updatedAt: NOW - 5*D, bidCount: 26, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(8), isDemo: true, category: 'development', tags: ['React', 'TypeScript', 'Web3.js', 'Anchor'],
    account: {
      client: pk(58), title: 'Solana Wallet Integration — 6 Adapters + TX History',
      description: 'Integrate Phantom, Solflare, Backpack, Ledger, Torus, and Coinbase wallets with full transaction history, token account display, and SPL token transfers. Must handle versioned transactions and lookup tables.',
      budget: Math.round(2.5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 8*D, updatedAt: NOW - 8*D, bidCount: 17, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(9), isDemo: true, category: 'development', tags: ['React', 'Three.js', 'GameFi', 'P2E'],
    account: {
      client: pk(59), title: 'Play-to-Earn Game Frontend (React + Three.js)',
      description: 'Develop the frontend for a P2E turn-based strategy game. Render hex-grid map with Three.js, animate NFT characters, handle on-chain game state updates in real time, and display leaderboard + reward system.',
      budget: Math.round(6 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 9*D, updatedAt: NOW - 9*D, bidCount: 7, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(10), isDemo: true, category: 'development', tags: ['Python', 'Analytics', 'On-chain', 'API'],
    account: {
      client: pk(60), title: 'On-chain Analytics Dashboard — Solana Validator Data',
      description: 'Build a data pipeline + dashboard that indexes Solana validator performance, stake distribution, and slot timing from mainnet RPC. Backend in Python (FastAPI), frontend in React. Clickhouse or TimescaleDB preferred.',
      budget: Math.round(5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 7*D, updatedAt: NOW - 7*D, bidCount: 9, escrowAmount: 0,
    },
  },

  // ── Security / Audit ─────────────────────────────────────────────────────────
  {
    publicKey: pk(11), isDemo: true, category: 'security', tags: ['Audit', 'Rust', 'Solana', 'Security'],
    account: {
      client: pk(61), title: 'Anchor Program Security Audit — DeFi Lending Protocol',
      description: 'Comprehensive security audit of a Solana lending protocol (~4,000 lines Rust). Focus on: PDA validation, overflow/underflow, CPI reentrancy, signer privilege escalation. Deliverable: detailed report with PoCs.',
      budget: Math.round(12 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 10*D, updatedAt: NOW - 10*D, bidCount: 6, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(12), isDemo: true, category: 'security', tags: ['Audit', 'Solidity', 'EVM', 'Security'],
    account: {
      client: pk(62), title: 'EVM Smart Contract Audit — Yield Aggregator',
      description: 'Security review of Solidity yield aggregator contracts on Ethereum. ~2,500 SLOC. Looking for auditor with track record on DeFi protocols. Must cover flash loan attacks, oracle manipulation, and access control.',
      budget: Math.round(8 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 14*D, updatedAt: NOW - 14*D, bidCount: 4, escrowAmount: 0,
    },
  },

  // ── Design ───────────────────────────────────────────────────────────────────
  {
    publicKey: pk(13), isDemo: true, category: 'design', tags: ['UI/UX', 'Figma', 'Branding', 'DeFi'],
    account: {
      client: pk(63), title: 'DeFi Protocol Brand Identity + Full UI Design System',
      description: 'Create a complete brand identity (logo, color system, typography) and Figma design system for a DeFi lending protocol. Deliverables: style guide, 30+ component library, desktop + mobile app screens.',
      budget: Math.round(2 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 2*D, updatedAt: NOW - 2*D, bidCount: 29, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(14), isDemo: true, category: 'design', tags: ['3D Art', 'Blender', 'NFT', 'Animation'],
    account: {
      client: pk(64), title: '3D NFT Avatar Collection — 5,000 Unique Characters',
      description: 'Design and render a 5,000-piece 3D PFP collection using Blender. Needs 8+ trait categories (background, body, head, eyes, mouth, accessory, outfit, special), rarity tiers, and layered export pipeline.',
      budget: Math.round(9 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 5*D, updatedAt: NOW - 5*D, bidCount: 5, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(15), isDemo: true, category: 'design', tags: ['UI/UX', 'Figma', 'Mobile', 'DEX'],
    account: {
      client: pk(65), title: 'Mobile DEX App UI/UX Design (iOS + Android)',
      description: 'Design a sleek mobile DEX application in Figma. Screens needed: onboarding, swap interface, liquidity pools, portfolio view, transaction history, and settings. Dark mode first. Export to React Native components.',
      budget: Math.round(1.8 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 11*D, updatedAt: NOW - 11*D, bidCount: 23, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(16), isDemo: true, category: 'design', tags: ['Illustration', 'NFT', 'PFP', 'Character Design'],
    account: {
      client: pk(66), title: '2D Character NFT Collection — 10,000 Pixel Art PFPs',
      description: 'Create a 10k pixel art PFP collection with a consistent art style. 10 categories, 150+ unique traits. Deliverables: all trait PNGs at 400×400px, layering order doc, and a preview generator script.',
      budget: Math.round(7 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 18*D, updatedAt: NOW - 18*D, bidCount: 8, escrowAmount: 0,
    },
  },

  // ── Writing / Research ───────────────────────────────────────────────────────
  {
    publicKey: pk(17), isDemo: true, category: 'writing', tags: ['Whitepaper', 'Technical Writing', 'Tokenomics', 'DeFi'],
    account: {
      client: pk(67), title: 'Technical Whitepaper + Tokenomics Model for DeFi Protocol',
      description: 'Write a 25-30 page technical whitepaper explaining our novel AMM design, accompanied by a full tokenomics spreadsheet model. Must have deep DeFi knowledge and prior whitepaper experience. LaTeX preferred.',
      budget: Math.round(2 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 3*D, updatedAt: NOW - 3*D, bidCount: 24, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(18), isDemo: true, category: 'writing', tags: ['Research', 'L2', 'Blockchain', 'Report'],
    account: {
      client: pk(68), title: 'Solana Ecosystem Research Report — Q2 2025',
      description: 'Produce a comprehensive 15-page report on Solana ecosystem growth: DeFi TVL trends, NFT volume, developer activity, and comparison with Ethereum L2s. Include charts, citations, and executive summary.',
      budget: Math.round(0.9 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 20*D, updatedAt: NOW - 20*D, bidCount: 18, escrowAmount: 0,
    },
  },

  // ── Marketing / Community ─────────────────────────────────────────────────────
  {
    publicKey: pk(19), isDemo: true, category: 'marketing', tags: ['Community', 'Discord', 'Telegram', 'Moderation'],
    account: {
      client: pk(69), title: 'Web3 Community Manager — Discord + Telegram (Part-time)',
      description: 'Manage and grow our Discord (8k members) and Telegram (3k members). Responsibilities: daily engagement, AMA coordination, moderation, weekly newsletters, and community analytics reports. Must speak English fluently.',
      budget: Math.round(2 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 1*D, updatedAt: NOW - 1*D, bidCount: 31, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(20), isDemo: true, category: 'marketing', tags: ['Marketing', 'Twitter', 'KOL', 'Growth'],
    account: {
      client: pk(70), title: 'Crypto KOL & Twitter Growth Campaign (3 months)',
      description: 'Plan and execute a 3-month Twitter growth campaign targeting 50k new followers. Deliverables: KOL partnerships (100k+ accounts), daily tweet schedule, thread strategy, and weekly engagement analytics.',
      budget: Math.round(3.5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 12*D, updatedAt: NOW - 12*D, bidCount: 19, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(21), isDemo: true, category: 'marketing', tags: ['Video', 'Animation', 'Explainer', 'Motion Graphics'],
    account: {
      client: pk(71), title: 'Animated Explainer Video — DeFi Protocol (2 min)',
      description: 'Produce a 2-minute animated explainer video explaining how our yield farming protocol works. Style: clean motion graphics with voice-over. Deliverables: source files, 1080p MP4, and 30s social short clip.',
      budget: Math.round(1.8 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 16*D, updatedAt: NOW - 16*D, bidCount: 14, escrowAmount: 0,
    },
  },

  // ── Specialized ──────────────────────────────────────────────────────────────
  {
    publicKey: pk(22), isDemo: true, category: 'development', tags: ['Rust', 'SDK', 'Open Source', 'Documentation'],
    account: {
      client: pk(72), title: 'Rust SDK for Solana Program — Full Client Library',
      description: 'Build a Rust SDK for our on-chain program: typed instruction builders, account deserialization, event parsing, and error handling. Must publish to crates.io with full docs, examples, and CI pipeline.',
      budget: Math.round(6 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 13*D, updatedAt: NOW - 13*D, bidCount: 6, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(23), isDemo: true, category: 'development', tags: ['Python', 'Automation', 'Tax', 'API'],
    account: {
      client: pk(73), title: 'Crypto Tax Report Automation Tool (Python)',
      description: 'Build a Python CLI + web UI that pulls transaction history from Solana, Ethereum, and BNB Chain via APIs, calculates cost basis (FIFO/LIFO), and exports IRS Form 8949 CSV. OAuth2 integration with Coinbase.',
      budget: Math.round(1.8 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 22*D, updatedAt: NOW - 22*D, bidCount: 16, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(24), isDemo: true, category: 'development', tags: ['Node.js', 'PostgreSQL', 'NFT', 'IPFS'],
    account: {
      client: pk(74), title: 'NFT Marketplace Backend API — Node.js + PostgreSQL',
      description: 'Build a REST + GraphQL API for an NFT marketplace: user profiles, collection indexing, rarity scoring, offers/bids, royalty splits, and IPFS metadata pinning via Pinata. Rate limiting, caching with Redis required.',
      budget: Math.round(5.5 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 28*D, updatedAt: NOW - 28*D, bidCount: 9, escrowAmount: 0,
    },
  },
  {
    publicKey: pk(25), isDemo: true, category: 'design', tags: ['UI/UX', 'Figma', 'GameFi', 'Web3'],
    account: {
      client: pk(75), title: 'GameFi Battle Arena — UI/UX Design & Design System',
      description: 'Design the complete UI for a blockchain-based battle arena game: lobby, character selection, battle HUD, inventory, marketplace, and leaderboard. Dark fantasy theme. Figma with auto-layout components required.',
      budget: Math.round(3.2 * SOL), metadataUri: '', status: { open: {} }, selectedFreelancer: null,
      createdAt: NOW - 35*D, updatedAt: NOW - 35*D, bidCount: 11, escrowAmount: 0,
    },
  },
];

/** Unique categories available in demo data */
export const DEMO_CATEGORIES = ['development', 'design', 'marketing', 'writing', 'security'] as const;
export type DemoCategory = typeof DEMO_CATEGORIES[number];
