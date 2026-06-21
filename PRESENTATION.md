# FreelanceChain — Project Presentation

**A Decentralized Freelance Marketplace on Solana Blockchain**
*Bachelor Thesis — School of Information and Communication Technology (SOICT)*

---

## 1. Overview

FreelanceChain is a fully on-chain freelance marketplace built on the Solana blockchain. It replaces centralized platforms (Upwork, Fiverr) with a trustless, transparent system where every contract, payment, and reputation record is governed by smart contracts — without any intermediary holding funds or making decisions.

**Live demo:** https://freelance-dapp.vercel.app
**On-chain program:** `FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i` (Solana Devnet)

---

## 2. Problem Statement

Traditional freelance platforms have three fundamental problems:

| Problem | Example |
|---------|---------|
| **Centralized custody of funds** | Platform holds escrow; can freeze accounts arbitrarily |
| **Opaque reputation** | Ratings are platform-owned and can be removed or manipulated |
| **High fees** | Upwork charges 5–20%; Fiverr takes 20% flat |
| **No privacy** | Full KYC data sent to a third-party company |

FreelanceChain solves all of these by moving the logic on-chain.

---

## 3. System Architecture

```
┌─────────────────────────────────────┐
│          Next.js Frontend           │
│  React + MUI + Framer Motion        │
│  TypeScript · React Query           │
│  @solana/wallet-adapter             │
└──────────────┬──────────────────────┘
               │ RPC (Devnet)
               ▼
┌─────────────────────────────────────┐
│     Anchor Smart Contract           │
│     (Rust · Solana Program)         │
│  Program ID: FStwCj8z...yyP7i       │
│  102 instructions · 18 modules      │
│  ~9,156 lines of Rust               │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
Solana PDAs          IPFS / Pinata
(on-chain state)     (files, CVs, portfolio)
```

**Frontend:** 186 TypeScript/TSX files, 35+ pages, fully responsive with dark/light mode.

---

## 4. On-Chain Program Modules (18 modules · 102 instructions)

| Module | Instructions | Description |
|--------|-------------|-------------|
| **Core Job Flow** | `create_job`, `submit_bid`, `select_bid`, `complete_job`, `cancel_job` | Full job lifecycle |
| **Escrow** | `deposit_escrow`, `release_escrow`, `deposit_token_escrow` | SOL + SPL token escrow |
| **Milestone** | `create_milestone`, `fund_milestone`, `approve_milestone`, `dispute_milestone` | Phased payment structure |
| **Dispute Resolution** | `raise_dispute`, `vote_dispute`, `resolve_dispute`, `add_evidence` | On-chain arbitration |
| **Juror Staking** | `stake_for_jury`, `cast_staked_vote`, `claim_staking_reward` | Skin-in-the-game voting |
| **Reputation** | `initialize_reputation`, `submit_review` | Immutable on-chain rating |
| **KYC** | `submit_kyc`, `finalize_kyc`, `reset_kyc` | Privacy-preserving identity |
| **SBT** | `mint_reputation_sbt`, `init_sbt_counter`, `revoke_sbt` | Soulbound achievement tokens |
| **DAO Governance** | `create_proposal`, `cast_dao_vote`, `finalize_proposal`, `execute_proposal` | Community governance |
| **Staking / Treasury** | `stake_tokens`, `unstake_tokens`, `collect_platform_fee`, `execute_buyback_burn` | Token economics |
| **DID** | `create_did_document`, `add_verification_method`, `anchor_verifiable_credential` | Decentralized identity |
| **ZK Proofs** | `submit_zk_credential`, `verify_zk_credential` | Zero-knowledge attestations |
| **Sybil Resistance** | `add_identity_stamp`, `recalculate_humanity_score` | Anti-bot scoring |
| **Referral** | `register_referral`, `distribute_referral_commission` | 2-level referral rewards |
| **Chat** | `send_message`, `mark_message_read` | On-chain messaging |
| **Social Recovery** | `setup_recovery`, `initiate_recovery`, `execute_recovery` | Guardian-based wallet recovery |
| **AI Oracle** | `submit_ai_verification`, `resolve_ai_dispute` | AI result anchoring |
| **Account Abstraction** | `create_session_key`, `use_session_key`, `record_sponsored_tx` | Gasless / session keys |

---

## 5. Key Features (Deep Dive)

### 5.1 Trustless Job & Escrow Flow

1. Client posts a job with budget locked in a **PDA escrow**
2. Freelancers submit bids; client selects one
3. Work is submitted on-chain; client approves → funds auto-release
4. If client does not respond within deadline → freelancer can escalate

No funds ever leave the blockchain until both parties agree, or a dispute is resolved.

### 5.2 Milestone-Based Payments

Jobs can be split into milestones. Each milestone has its own:
- On-chain funding from the escrow
- Individual approval/rejection cycle
- Dispute pathway if the milestone is contested

This gives clients control over incremental delivery and reduces freelancer risk.

### 5.3 Staked Dispute Resolution

When a dispute is raised:
1. **Jurors** who have staked SOL are randomly selected
2. Each juror casts a vote on-chain
3. Majority wins; losing side's stake is partially slashed
4. Winning jurors earn a share of the dispute fee

This creates genuine economic incentives for fair voting (skin in the game).

### 5.4 KYC Identity Verification (Privacy-Preserving)

A unique 4-step flow that runs **entirely in the browser**:

```
Step 1: Select ID type (passport / national ID / driver's license)
Step 2: Upload photo of ID document
Step 3: Live webcam selfie capture
Step 4: Face matching (browser-side, using @vladmandic/face-api)
         → Euclidean distance < 0.50 → VERIFIED
```

**Key design choices:**
- Face models (~6.5 MB) run locally; raw biometric data is never sent to any server
- On match success → write a `KycRecord` PDA to Solana (stores: id_type, face_distance_bp, timestamp)
- `face_distance_bp = distance × 10,000` stored as u32 basis points
- Profile pages and freelancer listings read KYC status directly from chain
- `VerifiedBadge` component shown across the app

### 5.5 AI-Powered Risk Assessment

When a client views a job application:
- Freelancer pastes their CV text
- System calls **Claude Haiku** (Anthropic) via a serverless API route
- Claude returns: match score (0–100), CV authenticity flag (AUTHENTIC / SUSPICIOUS / FABRICATED), risk level (LOW / MEDIUM / HIGH), and reasoning
- Results shown in a collapsible panel on the job detail page

This helps clients quickly screen applicants without reading every CV manually.

### 5.6 DAO Governance

Token holders can:
- Create proposals (parameter changes, treasury spending, feature requests)
- Vote with governance tokens (1 token = 1 vote)
- Proposals auto-execute on-chain when quorum is reached

### 5.7 Soulbound Tokens (SBTs)

Non-transferable NFTs minted on job completion. Each SBT encodes:
- Job title and amount
- Completion timestamp
- Client's signature (on-chain)

These serve as permanent, unforgeable proof of work history — independent of the platform.

### 5.8 Social Recovery

Users can designate **guardians** (trusted wallet addresses). If they lose wallet access:
1. Initiate recovery → notify guardians
2. Guardians approve on-chain (threshold-based)
3. Ownership transfers to new wallet; all PDAs (reputation, KYC, SBTs) remain intact

---

## 6. Frontend Highlights

- **35+ pages** covering all user flows (client, freelancer, arbitrator, DAO member)
- **Dark / Light mode** — full theme-aware design using MUI `ThemeProvider`
- **Guest browsing** — public pages (jobs, freelancers, governance) accessible without wallet
- **No Wallet Detected** dialog — detects installed wallet extensions; guides new users to install Phantom/Solflare or use Torus (web-based, no extension needed)
- **Real-time** unread message counter (polling every 10 seconds)
- **IPFS integration** — CV files, portfolio images stored on IPFS via Pinata; CIDs committed on-chain
- **Referral capture** — `?ref=WALLET` URL parameter auto-stored; commission distributed on job completion

---

## 7. Technology Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust · Anchor Framework · Solana |
| Frontend | Next.js 14 · TypeScript · React 18 |
| UI | Material UI (MUI) · Framer Motion |
| State / Cache | React Query (TanStack) |
| Wallet | `@solana/wallet-adapter` (Phantom, Solflare, Torus) |
| Storage | IPFS / Pinata |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5`) |
| Face Matching | `@vladmandic/face-api` (TinyFaceDetector + FaceRecognitionNet) |
| Deployment | Vercel (frontend) · Solana Devnet (program) |

---

## 8. Deployment Facts

| Item | Value |
|------|-------|
| Program ID | `FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i` |
| Network | Solana Devnet |
| Program binary | ~1.6 MB (optimized with `opt-level = "z"`) |
| On-chain allocated | 2.17 MB (extended via `solana program extend`) |
| Frontend URL | https://freelance-dapp.vercel.app |
| Total instructions | 102 |
| Rust source lines | ~9,156 |
| Frontend TS files | 186 |

---

## 9. What Makes This Different from Existing Work

| Feature | Upwork/Fiverr | Existing DApp research | FreelanceChain |
|---------|--------------|----------------------|----------------|
| Trustless escrow | ✗ (platform custody) | ✓ basic | ✓ milestone-based |
| On-chain reputation | ✗ | partial | ✓ immutable SBTs + review record |
| Dispute resolution | centralized | ✗ or simple majority | ✓ staked juror system |
| KYC privacy | ✗ (sends data to third party) | ✗ | ✓ browser-side face match |
| AI screening | ✗ | ✗ | ✓ Claude-powered risk panel |
| DAO governance | ✗ | ✗ | ✓ on-chain proposals + voting |
| Social recovery | N/A | ✗ | ✓ guardian threshold model |
| Zero-knowledge proofs | ✗ | ✗ | ✓ ZK credential anchoring |

---

## 10. Limitations & Future Work

- **Devnet only** — production deployment requires auditing and mainnet SOL
- **Face models are approximations** — not a certified biometric system; threshold tuning needed
- **Governance token** not yet issued as a real SPL token (simulated in frontend)
- **AI oracle** is trusted (off-chain); a future version could use on-chain verifiable inference
- **Mobile** — wallet adapter UX on mobile browsers is limited by Phantom's in-app browser

---

## Quick Q&A Reference

**Q: How is escrow secured?**
PDA (Program Derived Address) owned exclusively by the Solana program — no private key, no admin can drain it. Funds release only via program logic.

**Q: What happens if a client disappears after work is submitted?**
After a configurable deadline, the freelancer can raise a dispute. Jurors resolve it and funds are released based on majority vote.

**Q: Is the KYC data stored on-chain?**
Only the face distance score (as basis points) and ID type enum are stored on-chain. The actual images are never uploaded anywhere — they exist only in the browser session and are discarded after matching.

**Q: Why Solana over Ethereum?**
Transaction fees (~$0.00025 per tx on Solana vs $2–50 on Ethereum mainnet) and throughput (65,000 TPS theoretical). For a marketplace with frequent small interactions, Ethereum is economically impractical.

**Q: How many on-chain accounts does a typical job use?**
~5–7 PDAs: Job, Escrow, Bid(s), Reputation (client + freelancer), optionally MilestoneList and KycRecord.

---

*Prepared for thesis defense presentation — SOICT DATN 2025–2026*
