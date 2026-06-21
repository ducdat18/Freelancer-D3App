/**
 * ============================================================
 *  SEED PLATFORM — Populate devnet with realistic on-chain data
 * ============================================================
 *
 *  This script creates:
 *    1. 6 freelancer wallets (saved to .keys/freelancers/)
 *    2. Reputation accounts for all wallets
 *    3. 5 completed job cycles per freelancer → real reputation scores
 *    4. 15 open showcase jobs (varied categories/budgets)
 *    5. Bids on showcase jobs from freelancers
 *    6. 3 active dispute scenarios
 *    7. KYC verification for 3 freelancers
 *
 *  Usage:
 *    npx ts-node scripts/seed-platform.ts
 *
 *  Requires: .keys/deployer.json (~12 SOL on devnet)
 * ============================================================
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// ── Config ───────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey("FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i");
const NUM_FREELANCERS = 6;
const REP_CYCLES = 5; // completed jobs per freelancer to build reputation
const FREELANCERS_DIR = path.resolve(__dirname, "../.keys/freelancers");
const RPC_URL = process.env.ANCHOR_PROVIDER_URL || clusterApiUrl("devnet");

// ── PDA Helpers ──────────────────────────────────────────────
function deriveJobPDA(client: PublicKey, jobId: anchor.BN): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(jobId.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("job"), client.toBuffer(), buf],
    PROGRAM_ID
  );
}
function deriveBidPDA(job: PublicKey, freelancer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bid"), job.toBuffer(), freelancer.toBuffer()],
    PROGRAM_ID
  );
}
function deriveEscrowPDA(job: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), job.toBuffer()],
    PROGRAM_ID
  );
}
function deriveWorkPDA(job: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("work"), job.toBuffer()],
    PROGRAM_ID
  );
}
function deriveDisputePDA(job: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dispute"), job.toBuffer()],
    PROGRAM_ID
  );
}
function deriveReputationPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), user.toBuffer()],
    PROGRAM_ID
  );
}
function deriveReviewPDA(job: PublicKey, reviewer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("review"), job.toBuffer(), reviewer.toBuffer()],
    PROGRAM_ID
  );
}
function deriveKycPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("kyc"), user.toBuffer()],
    PROGRAM_ID
  );
}

// ── Showcase Jobs ─────────────────────────────────────────────
const SHOWCASE_JOBS = [
  {
    title: "Build Solana DEX Aggregator with Jupiter SDK",
    description: "Develop a decentralized exchange aggregator using Jupiter v6 API. Features: multi-hop routing, slippage protection, price impact calculation, and a clean React frontend with wallet adapter. Must support SOL and major SPL tokens. Deliver with full tests and documentation.",
    budget: 7.5,
    proposal: "I have built 3 DEX integrations on Solana. I can deliver a fully tested aggregator with Jupiter v6, complete with slippage UI and transaction retry logic. Timeline: 3 weeks.",
    timeline: 21,
  },
  {
    title: "Design Full Brand Identity for Web3 Startup",
    description: "Create a complete brand identity including logo, color palette, typography system, and brand guidelines. Deliverables: SVG logo variations, Figma design system, business card, and social media kit. The project is a DeFi lending protocol targeting institutional clients.",
    budget: 2.2,
    proposal: "Specialized in Web3 branding. I'll create a distinctive identity that communicates trust and innovation — logo, palette, Figma components, and full brand guidelines. Previous clients: 4 Solana protocols.",
    timeline: 14,
  },
  {
    title: "Smart Contract Security Audit — Anchor Program",
    description: "Conduct a comprehensive security audit for a 2000-line Anchor program handling escrow and DAO voting. Must include: static analysis, manual code review, vulnerability classification (Critical/High/Medium/Low), PoC exploits for critical findings, and a remediation guide.",
    budget: 9.0,
    proposal: "Senior Rust/Anchor auditor. I've audited 12 programs on Solana mainnet. I'll provide a 40-page report with all findings classified by severity, PoC exploits, and remediation steps within 2 weeks.",
    timeline: 14,
  },
  {
    title: "Build NFT Staking Platform with Reward Multipliers",
    description: "Create an NFT staking dApp where holders stake NFTs to earn SPL token rewards. Features: tier-based multipliers based on NFT rarity, daily reward calculation, un-stake cooldown, and a dashboard showing earned/pending rewards. Metaplex NFT standard.",
    budget: 5.8,
    proposal: "Built two NFT staking platforms on Solana. I'll implement tier multipliers, rarity indexing via Metaplex attributes, and a slick React dashboard. Timeline: 2.5 weeks. Tests included.",
    timeline: 18,
  },
  {
    title: "Create 60-Second Explainer Animation for DeFi Protocol",
    description: "Produce a professional 60-second animated explainer video explaining our yield optimization protocol. Style: modern motion graphics with crypto aesthetic. Deliverables: MP4 (4K + 1080p), project source files, and 3 social media clips (15s each) extracted from the main video.",
    budget: 1.8,
    proposal: "Motion graphics designer with 5 years experience. I specialize in DeFi/crypto explainers. I'll provide storyboard, animatic review, and final 4K render. Revisions: 2 rounds included.",
    timeline: 10,
  },
  {
    title: "Write 10 Technical Blog Posts on Solana Ecosystem",
    description: "Produce 10 high-quality technical blog posts (1500–2500 words each) covering Solana ecosystem topics: Anchor framework, SPL tokens, DeFi protocols, NFT standards, and developer tooling. Each post needs code examples, diagrams, and SEO optimization. Target audience: senior developers.",
    budget: 1.2,
    proposal: "Technical writer with Solana dev background. I write for Helius, Solana.com, and top protocol blogs. Each post will include tested code snippets, diagrams, and proper SEO. Delivery: 1 post/2 days.",
    timeline: 20,
  },
  {
    title: "Develop React Native Wallet App (iOS + Android)",
    description: "Build a non-custodial Solana wallet mobile app using React Native. Features: seed phrase creation/import, SOL + SPL token send/receive, transaction history, QR scanner, biometric lock, and WalletConnect v2 support. App Store and Google Play submission included.",
    budget: 8.5,
    proposal: "React Native developer with 3 shipped Solana apps. I'll build the full wallet with biometric auth, WalletConnect, and handle both app store submissions. Full source code and documentation delivered.",
    timeline: 30,
  },
  {
    title: "Set Up CI/CD Pipeline for Anchor Program",
    description: "Configure a complete CI/CD pipeline for our Anchor monorepo. Needs: automated build and test on PR, deploy to devnet on merge to develop, deploy to mainnet on release tags, security scanning, and Slack notifications. GitHub Actions preferred. Anchor v0.30+.",
    budget: 1.5,
    proposal: "DevOps specialist with Anchor CI/CD experience. I'll set up GitHub Actions with devnet/mainnet deploy workflows, caching for faster builds, and automated security scanning. Full YAML files + docs delivered.",
    timeline: 7,
  },
  {
    title: "Grow Twitter Community from 0 to 5K Followers",
    description: "Manage and grow our DeFi protocol's Twitter account over 30 days. Responsibilities: daily tweets (3–5/day), engage with ecosystem influencers, thread writing, Space event hosting, and weekly analytics report. Must have demonstrable experience growing crypto projects on Twitter.",
    budget: 2.0,
    proposal: "Web3 community manager with proven Twitter growth track record. Grew @SolanaAlpha from 200 to 12K in 45 days. I'll create a content calendar, engage with KOLs, and deliver weekly analytics. 30 days.",
    timeline: 30,
  },
  {
    title: "Integrate Pyth Oracle Price Feeds into DeFi App",
    description: "Add Pyth Network real-time price feed integration to our existing lending protocol. Need: SOL, ETH, BTC, USDC price feeds, confidence interval checks, staleness validation, and proper fallback logic. Anchor program modifications + frontend price display widget.",
    budget: 3.2,
    proposal: "Solana dev with Pyth integration experience. I've connected Pyth feeds to 2 lending protocols. I'll update your Anchor accounts, add staleness checks, confidence filtering, and build the price display widget.",
    timeline: 7,
  },
  {
    title: "Design Figma UI Kit for Solana dApp",
    description: "Create a comprehensive Figma UI component library tailored for Solana dApps. Components needed: wallet connect button states, token input fields, transaction confirmation modals, NFT card variants, data tables for on-chain data, and dark/light mode support. Auto-layout required.",
    budget: 1.6,
    proposal: "UI/UX designer specializing in Web3 design systems. I've built 3 Solana UI kits used by 20+ dApps. I'll create fully tokenized, auto-layout components with dark mode and comprehensive documentation.",
    timeline: 12,
  },
  {
    title: "Python Script for On-Chain Analytics Dashboard",
    description: "Build a Python data pipeline that fetches on-chain data from Solana (transactions, program accounts) and feeds a live analytics dashboard. Stack: Python + Solana.py, PostgreSQL for storage, and Grafana for visualization. Metrics: TVL, active users, daily transactions, fee revenue.",
    budget: 2.8,
    proposal: "Data engineer with Solana analytics experience. I built similar dashboards for 2 DeFi protocols. I'll set up the full stack: Python RPC polling, PostgreSQL schema, Grafana panels, and automated refresh.",
    timeline: 14,
  },
  {
    title: "Localize Platform into Vietnamese and Thai",
    description: "Translate and localize our DeFi web app into Vietnamese and Thai. Includes: UI strings, error messages, help documentation, and marketing copy. Work with our i18next setup. Must be native speaker or professional translator with crypto/financial terminology experience.",
    budget: 0.8,
    proposal: "Native Vietnamese speaker and professional translator with 4 years of DeFi/fintech localization. I'll translate all strings, review for cultural appropriateness, and test the i18next integration. Thai partner available.",
    timeline: 5,
  },
  {
    title: "Build Governance Dashboard with On-Chain Proposals",
    description: "Create a DAO governance frontend that displays proposals, voting status, quorum progress, and allows token holders to cast votes. Integration with our existing Anchor governance program. Features: proposal detail view, vote breakdown chart, delegation support, and vote history.",
    budget: 4.5,
    proposal: "Frontend dev with DAO governance experience. I built the Mango Markets governance UI. I'll implement proposal listing, vote casting, delegation UX, and beautiful charts for vote breakdown. React + MUI.",
    timeline: 14,
  },
  {
    title: "Audit and Optimize PostgreSQL Queries for dApp Backend",
    description: "Review and optimize slow PostgreSQL queries in our Solana indexer backend. Expecting 50+ queries to audit. Deliverables: EXPLAIN ANALYZE reports, index recommendations, optimized query rewrites, and estimated performance improvement percentages. Node.js/TypeScript codebase.",
    budget: 1.4,
    proposal: "Database engineer with PostgreSQL optimization experience. I've optimized blockchain indexer DBs at 3 startups. I'll profile every slow query, add optimal indexes, and rewrite N+1 patterns. Expect 5–10x speedup.",
    timeline: 5,
  },
];

// ── Dispute Scenarios ─────────────────────────────────────────
const DISPUTE_JOBS = [
  {
    title: "Develop Token Vesting Contract",
    description: "Build a Solana vesting contract for team token allocations. Features: cliff period, linear vesting, admin revocation, and beneficiary claiming UI. Anchor framework required.",
    budget: 4.0,
    proposal: "Anchor developer. I can build a full vesting contract with cliff logic, linear schedule, and React claiming UI. All accounts derived deterministically. Delivery: 10 days.",
    timeline: 10,
    deliverable: "ipfs://QmTokenVestingDeliverable123456789",
    disputeReason: "Freelancer delivered a vesting contract missing the cliff period logic and the revocation feature. The React UI crashes on mobile. Core deliverables were not met despite multiple reminders over 5 days.",
  },
  {
    title: "Build Discord Bot for Solana Wallet Verification",
    description: "Create a Discord bot that verifies Solana wallet ownership via signature challenge and assigns roles based on NFT/token holdings. Supports multiple guilds, slash commands, and Helius webhooks for real-time updates.",
    budget: 1.8,
    proposal: "Discord bot developer with Solana experience. I'll build wallet verification with signature challenge, NFT role gating, and Helius webhook support. Delivered as Docker container. Timeline: 5 days.",
    timeline: 5,
    deliverable: "ipfs://QmDiscordBotDeliverable456789",
    disputeReason: "Delivered bot is a copy of an open-source template with minor modifications. The NFT role gating doesn't work and webhook integration is missing. Client requested refund but freelancer went silent.",
  },
  {
    title: "Create Whitepaper for Layer-2 Protocol",
    description: "Write a comprehensive technical whitepaper (20–30 pages) for a Solana L2 scaling solution. Must cover: protocol design, security model, economic incentives, competitive analysis, and mathematical proofs. LaTeX format preferred.",
    budget: 3.5,
    proposal: "Technical writer with PhD in distributed systems. I've written 4 DeFi whitepapers. I'll draft the architecture, economic model, and security proofs in LaTeX. 3 revision rounds. Timeline: 14 days.",
    timeline: 14,
    deliverable: "ipfs://QmWhitepaperDeliverable789123",
    disputeReason: "The submitted whitepaper is 8 pages (not 20-30 as agreed), lacks mathematical proofs, and the competitive analysis section was AI-generated with outdated information. Multiple requested revisions were ignored.",
  },
];

// ── Helpers ───────────────────────────────────────────────────
async function airdropSafe(connection: Connection, to: PublicKey, sol: number) {
  try {
    const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(section: string, msg: string) {
  process.stdout.write(`  [${section}] ${msg}\n`);
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║        FREELANCECHAIN PLATFORM SEEDER v1.0           ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // ── Provider & Program ────────────────────────────────────
  const connection = new Connection(RPC_URL, "confirmed");
  const deployerPath = path.resolve(__dirname, "../.keys/deployer.json");
  const deployerSecret = JSON.parse(fs.readFileSync(deployerPath, "utf-8"));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(deployerSecret));

  const wallet = new anchor.Wallet(deployer);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../target/idl/freelance_marketplace.json"), "utf-8")
  );
  // Anchor 0.30+: programId is read from idl.address, not passed as arg
  idl.address = PROGRAM_ID.toBase58();
  const program = new anchor.Program(idl, provider);

  const deployerBal = await connection.getBalance(deployer.publicKey);
  console.log(`Deployer: ${deployer.publicKey.toBase58()}`);
  console.log(`Balance:  ${(deployerBal / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);

  if (deployerBal < 5 * LAMPORTS_PER_SOL) {
    console.error("❌ Deployer needs at least 5 SOL. Run: solana airdrop 5");
    process.exit(1);
  }

  // ── Phase 1: Generate Freelancer Keypairs ─────────────────
  console.log("━━━ Phase 1: Freelancer Wallets ━━━━━━━━━━━━━━━━━━━━━━━\n");
  fs.mkdirSync(FREELANCERS_DIR, { recursive: true });

  const freelancers: Keypair[] = [];
  for (let i = 0; i < NUM_FREELANCERS; i++) {
    const keyPath = path.join(FREELANCERS_DIR, `freelancer-${i}.json`);
    let kp: Keypair;
    if (fs.existsSync(keyPath)) {
      kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf-8"))));
      log(`FL-${i}`, `Loaded: ${kp.publicKey.toBase58()}`);
    } else {
      kp = Keypair.generate();
      fs.writeFileSync(keyPath, JSON.stringify(Array.from(kp.secretKey)));
      log(`FL-${i}`, `Generated: ${kp.publicKey.toBase58()}`);
    }
    freelancers.push(kp);
  }

  // ── Phase 2: Fund Freelancers from Deployer ───────────────
  console.log("\n━━━ Phase 2: Funding Wallets (transfer from deployer) ━━━\n");
  const FUND_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
  for (let i = 0; i < freelancers.length; i++) {
    const bal = await connection.getBalance(freelancers[i].publicKey);
    if (bal < 0.3 * LAMPORTS_PER_SOL) {
      try {
        const tx = new anchor.web3.Transaction().add(
          anchor.web3.SystemProgram.transfer({
            fromPubkey: deployer.publicKey,
            toPubkey: freelancers[i].publicKey,
            lamports: FUND_AMOUNT,
          })
        );
        const sig = await provider.sendAndConfirm(tx, []);
        log(`FL-${i}`, `Funded 0.5 SOL from deployer ✔ (${sig.slice(0, 12)}...)`);
      } catch (e: any) {
        log(`FL-${i}`, `Fund failed: ${e.message?.slice(0, 50)}`);
      }
    } else {
      log(`FL-${i}`, `Already funded: ${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
    }
    await sleep(400);
  }

  // ── Phase 3: Initialize Reputation Accounts ───────────────
  console.log("\n━━━ Phase 3: Reputation Accounts ━━━━━━━━━━━━━━━━━━━━━━\n");

  // Deployer reputation
  const [deployerRepPda] = deriveReputationPDA(deployer.publicKey);
  try {
    await program.methods.initializeReputation()
      .accounts({ reputation: deployerRepPda, user: deployer.publicKey, systemProgram: SystemProgram.programId })
      .rpc();
    log("Deployer", "Reputation initialized ✔");
  } catch {
    log("Deployer", "Reputation already exists");
  }

  // Freelancer reputations
  for (let i = 0; i < freelancers.length; i++) {
    const [repPda] = deriveReputationPDA(freelancers[i].publicKey);
    try {
      await program.methods.initializeReputation()
        .accounts({ reputation: repPda, user: freelancers[i].publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancers[i]])
        .rpc();
      log(`FL-${i}`, "Reputation initialized ✔");
    } catch {
      log(`FL-${i}`, "Reputation already exists");
    }
    await sleep(300);
  }

  // ── Phase 4: Reputation Building (completed job cycles) ───
  console.log("\n━━━ Phase 4: Building Reputation (5 cycles × 6 freelancers) ━━━\n");
  let jobCounter = Date.now(); // timestamp-based to avoid collisions

  for (let fi = 0; fi < freelancers.length; fi++) {
    const freelancer = freelancers[fi];
    let successCycles = 0;

    for (let cycle = 0; cycle < REP_CYCLES; cycle++) {
      const jobId = new anchor.BN(jobCounter++);
      try {
        const [jobPda] = deriveJobPDA(deployer.publicKey, jobId);
        const [bidPda] = deriveBidPDA(jobPda, freelancer.publicKey);
        const [escrowPda] = deriveEscrowPDA(jobPda);
        const [workPda] = deriveWorkPDA(jobPda);
        const [reviewPda] = deriveReviewPDA(jobPda, deployer.publicKey);
        const [freelancerRepPda] = deriveReputationPDA(freelancer.publicKey);

        // 1. Create job
        await program.methods.createJob(
          jobId, "Reputation builder", "Internal cycle", new anchor.BN(0.01 * LAMPORTS_PER_SOL), "ipfs://QmRep", null
        ).accounts({ job: jobPda, client: deployer.publicKey, systemProgram: SystemProgram.programId }).rpc();

        // 2. Bid
        await program.methods.submitBid(
          new anchor.BN(0.01 * LAMPORTS_PER_SOL), "Ready to deliver", 1, null
        ).accounts({ bid: bidPda, job: jobPda, freelancer: freelancer.publicKey, systemProgram: SystemProgram.programId })
          .signers([freelancer]).rpc();

        // 3. Select bid
        await program.methods.selectBid()
          .accounts({ job: jobPda, bid: bidPda, client: deployer.publicKey }).rpc();

        // 4. Deposit escrow
        await program.methods.depositEscrow(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
          .accounts({ escrow: escrowPda, job: jobPda, client: deployer.publicKey, systemProgram: SystemProgram.programId }).rpc();

        // 5. Submit work
        await program.methods.submitWork("ipfs://QmRepWork")
          .accounts({ workSubmission: workPda, job: jobPda, freelancer: freelancer.publicKey, systemProgram: SystemProgram.programId })
          .signers([freelancer]).rpc();

        // 6. Release escrow
        await program.methods.releaseEscrow()
          .accounts({ escrow: escrowPda, job: jobPda, freelancer: freelancer.publicKey, client: deployer.publicKey }).rpc();

        // 7. Review (5 stars)
        await program.methods.submitReview(5, "Excellent work, delivered on time!")
          .accounts({
            review: reviewPda, job: jobPda,
            revieweeReputation: freelancerRepPda,
            reviewer: deployer.publicKey, reviewee: freelancer.publicKey,
            systemProgram: SystemProgram.programId,
          }).rpc();

        successCycles++;
        process.stdout.write(`  [FL-${fi}] cycle ${cycle + 1}/${REP_CYCLES} ✔\n`);
      } catch (e: any) {
        process.stdout.write(`  [FL-${fi}] cycle ${cycle + 1} FAILED: ${e.message?.slice(0, 60)}\n`);
      }
      await sleep(400);
    }

    // Print final reputation
    try {
      const [repPda] = deriveReputationPDA(freelancer.publicKey);
      const rep = await (program.account as any).reputation.fetch(repPda);
      log(`FL-${fi}`, `Final rep: rating=${rep.averageRating}, reviews=${rep.totalReviews}, jobs=${rep.completedJobs} (${successCycles}/${REP_CYCLES} cycles ok)\n`);
    } catch {
      log(`FL-${fi}`, `Could not fetch reputation`);
    }
  }

  // ── Phase 5: Create Showcase Open Jobs ────────────────────
  console.log("\n━━━ Phase 5: Showcase Open Jobs ━━━━━━━━━━━━━━━━━━━━━━━\n");
  const showcaseJobPDAs: PublicKey[] = [];

  for (let i = 0; i < SHOWCASE_JOBS.length; i++) {
    const jd = SHOWCASE_JOBS[i];
    const jobId = new anchor.BN(jobCounter++);
    try {
      const [jobPda] = deriveJobPDA(deployer.publicKey, jobId);
      await program.methods.createJob(
        jobId,
        jd.title,
        jd.description,
        new anchor.BN(Math.round(jd.budget * LAMPORTS_PER_SOL)),
        `ipfs://QmShowcase${i + 1}`,
        null
      ).accounts({ job: jobPda, client: deployer.publicKey, systemProgram: SystemProgram.programId }).rpc();

      showcaseJobPDAs.push(jobPda);
      log(`Job-${i + 1}`, `Created: "${jd.title.slice(0, 45)}..." ✔`);
    } catch (e: any) {
      log(`Job-${i + 1}`, `FAILED: ${e.message?.slice(0, 60)}`);
      showcaseJobPDAs.push(PublicKey.default); // placeholder
    }
    await sleep(400);
  }

  // ── Phase 6: Submit Bids on Showcase Jobs ─────────────────
  console.log("\n━━━ Phase 6: Bidding on Showcase Jobs ━━━━━━━━━━━━━━━━━\n");

  // Each freelancer bids on a different set of jobs
  // FL-0: jobs 0,1,2,3,4   FL-1: jobs 2,3,4,5,6   FL-2: jobs 4,5,6,7,8
  // FL-3: jobs 6,7,8,9,10  FL-4: jobs 8,9,10,11,12 FL-5: jobs 10,11,12,13,14
  const bidAssignments: [number, number][] = [
    [0, 0], [0, 2], [0, 4], [0, 6], [0, 8],
    [1, 1], [1, 3], [1, 5], [1, 7], [1, 9],
    [2, 0], [2, 2], [2, 5], [2, 8], [2, 10],
    [3, 1], [3, 3], [3, 6], [3, 9], [3, 11],
    [4, 4], [4, 7], [4, 10], [4, 12], [4, 13],
    [5, 2], [5, 6], [5, 9], [5, 12], [5, 14],
  ];

  for (const [fi, ji] of bidAssignments) {
    if (ji >= showcaseJobPDAs.length) continue;
    const jobPda = showcaseJobPDAs[ji];
    if (jobPda.equals(PublicKey.default)) continue;
    const freelancer = freelancers[fi];
    const jd = SHOWCASE_JOBS[ji];

    try {
      const [bidPda] = deriveBidPDA(jobPda, freelancer.publicKey);
      await program.methods.submitBid(
        new anchor.BN(Math.round(jd.budget * LAMPORTS_PER_SOL)),
        jd.proposal,
        jd.timeline,
        null
      ).accounts({ bid: bidPda, job: jobPda, freelancer: freelancer.publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancer]).rpc();

      log(`Bid`, `FL-${fi} → Job-${ji + 1} "${jd.title.slice(0, 30)}..." ✔`);
    } catch (e: any) {
      const msg = e.message?.slice(0, 60) || "";
      if (!msg.includes("already in use")) {
        log(`Bid`, `FL-${fi} → Job-${ji + 1} FAILED: ${msg}`);
      }
    }
    await sleep(350);
  }

  // ── Phase 7: Create Disputed Jobs ─────────────────────────
  console.log("\n━━━ Phase 7: Dispute Scenarios ━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (let i = 0; i < DISPUTE_JOBS.length; i++) {
    const dj = DISPUTE_JOBS[i];
    const freelancer = freelancers[i % freelancers.length];
    const jobId = new anchor.BN(jobCounter++);

    try {
      const [jobPda] = deriveJobPDA(deployer.publicKey, jobId);
      const [bidPda] = deriveBidPDA(jobPda, freelancer.publicKey);
      const [escrowPda] = deriveEscrowPDA(jobPda);
      const [workPda] = deriveWorkPDA(jobPda);
      const [disputePda] = deriveDisputePDA(jobPda);

      // 1. Create job
      await program.methods.createJob(
        jobId, dj.title, dj.description,
        new anchor.BN(Math.round(dj.budget * LAMPORTS_PER_SOL)),
        `ipfs://QmDispute${i + 1}`, null
      ).accounts({ job: jobPda, client: deployer.publicKey, systemProgram: SystemProgram.programId }).rpc();
      log(`Dispute-${i + 1}`, "Job created ✔");

      // 2. Bid
      await program.methods.submitBid(
        new anchor.BN(Math.round(dj.budget * LAMPORTS_PER_SOL)), dj.proposal, dj.timeline, null
      ).accounts({ bid: bidPda, job: jobPda, freelancer: freelancer.publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancer]).rpc();
      log(`Dispute-${i + 1}`, "Bid submitted ✔");

      // 3. Select bid
      await program.methods.selectBid()
        .accounts({ job: jobPda, bid: bidPda, client: deployer.publicKey }).rpc();
      log(`Dispute-${i + 1}`, "Bid selected ✔");

      // 4. Deposit escrow
      await program.methods.depositEscrow(new anchor.BN(Math.round(dj.budget * LAMPORTS_PER_SOL)))
        .accounts({ escrow: escrowPda, job: jobPda, client: deployer.publicKey, systemProgram: SystemProgram.programId }).rpc();
      log(`Dispute-${i + 1}`, "Escrow deposited ✔");

      // 5. Submit work
      await program.methods.submitWork(dj.deliverable)
        .accounts({ workSubmission: workPda, job: jobPda, freelancer: freelancer.publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancer]).rpc();
      log(`Dispute-${i + 1}`, "Work submitted ✔");

      // 6. Client rejects work
      await program.methods.rejectWork(dj.disputeReason)
        .accounts({ workSubmission: workPda, job: jobPda, escrow: escrowPda, client: deployer.publicKey, systemProgram: SystemProgram.programId })
        .rpc();
      log(`Dispute-${i + 1}`, "Work rejected ✔");

      // 7. Freelancer raises dispute
      await program.methods.raiseDispute(dj.disputeReason)
        .accounts({ dispute: disputePda, job: jobPda, escrow: escrowPda, freelancer: freelancer.publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancer]).rpc();
      log(`Dispute-${i + 1}`, `Dispute raised ✔  — "${dj.title.slice(0, 40)}..."\n`);
    } catch (e: any) {
      log(`Dispute-${i + 1}`, `FAILED at some step: ${e.message?.slice(0, 80)}\n`);
    }
    await sleep(500);
  }

  // ── Phase 8: KYC Verification ─────────────────────────────
  console.log("\n━━━ Phase 8: KYC Verification (3 freelancers) ━━━━━━━━━\n");

  const KYC_FREELANCERS = [0, 2, 4]; // FL-0, FL-2, FL-4 get KYC verified
  const ID_TYPES = [
    { passport: {} },
    { nationalId: {} },
    { passport: {} },
  ];

  for (let ki = 0; ki < KYC_FREELANCERS.length; ki++) {
    const fi = KYC_FREELANCERS[ki];
    const freelancer = freelancers[fi];
    const idType = ID_TYPES[ki];
    const [kycPda] = deriveKycPDA(freelancer.publicKey);

    // Build a deterministic 32-byte verification hash
    const hashBytes = new Uint8Array(32);
    const seed = `kyc_verified_fl${fi}_${freelancer.publicKey.toBase58().slice(0, 8)}`;
    for (let b = 0; b < Math.min(seed.length, 32); b++) {
      hashBytes[b] = seed.charCodeAt(b);
    }

    try {
      // Submit KYC (creates pending record)
      await program.methods.submitKyc(idType)
        .accounts({ kycRecord: kycPda, user: freelancer.publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancer]).rpc();
      log(`KYC-FL-${fi}`, "Pending record created ✔");
    } catch (e: any) {
      const msg = e.message || "";
      if (!msg.includes("already in use")) {
        log(`KYC-FL-${fi}`, `submitKyc failed: ${msg.slice(0, 60)}`);
      } else {
        log(`KYC-FL-${fi}`, "KYC record already exists");
      }
    }
    await sleep(400);

    try {
      // Finalize KYC (sets to verified)
      await program.methods.finalizeKyc(idType, Array.from(hashBytes), true)
        .accounts({ kycRecord: kycPda, user: freelancer.publicKey, systemProgram: SystemProgram.programId })
        .signers([freelancer]).rpc();
      log(`KYC-FL-${fi}`, "KYC VERIFIED on-chain ✔\n");
    } catch (e: any) {
      log(`KYC-FL-${fi}`, `finalizeKyc failed: ${e.message?.slice(0, 60)}\n`);
    }
    await sleep(400);
  }

  // ── Summary ───────────────────────────────────────────────
  const finalBal = await connection.getBalance(deployer.publicKey);
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║                 SEEDING COMPLETE                     ║");
  console.log("╚═══════════════════════════════════════════════════════╝");
  console.log(`\n  Deployer balance remaining: ${(finalBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`  Freelancer keypairs: ${FREELANCERS_DIR}`);
  console.log(`  Live at: https://freelance-dapp.vercel.app\n`);
}

main().catch((e) => {
  console.error("\n❌ Fatal error:", e);
  process.exit(1);
});
