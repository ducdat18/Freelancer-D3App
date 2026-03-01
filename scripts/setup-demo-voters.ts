/**
 * ============================================================
 *  SETUP DEMO VOTERS — Run ONCE before your live presentation
 * ============================================================
 *
 *  This script:
 *    1. Generates 10 filesystem keypairs (saved to .keys/voters/)
 *    2. Airdrops SOL to each voter
 *    3. Initializes reputation accounts for each voter
 *    4. Bootstraps reputation by running 5 job-cycles per voter
 *       so every voter reaches rating=5.0 with 5 reviews
 *       (meeting the 4.0 rating + 5 review threshold for voting)
 *
 *  Usage:
 *    npx ts-node scripts/setup-demo-voters.ts
 *
 *  After running this once, the voter keypair files persist on disk.
 *  The simulate-community-vote.ts script will load them.
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

// ── Config ──────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey(
  "FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i"
);
const NUM_VOTERS = 10;
const REVIEWS_PER_VOTER = 5; // must be >= 5 to meet arbitration threshold
const VOTERS_DIR = path.resolve(__dirname, "../.keys/voters");
const RPC_URL =
  process.env.ANCHOR_PROVIDER_URL || clusterApiUrl("devnet");

// ── Helpers ─────────────────────────────────────────────────
function deriveJobPDA(
  client: PublicKey,
  jobId: anchor.BN
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(jobId.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("job"), client.toBuffer(), buf],
    PROGRAM_ID
  );
}
function deriveBidPDA(
  job: PublicKey,
  freelancer: PublicKey
): [PublicKey, number] {
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
function deriveReputationPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), user.toBuffer()],
    PROGRAM_ID
  );
}
function deriveReviewPDA(
  job: PublicKey,
  reviewer: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("review"), job.toBuffer(), reviewer.toBuffer()],
    PROGRAM_ID
  );
}

async function airdropAndConfirm(
  connection: Connection,
  to: PublicKey,
  sol: number
) {
  const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     DEMO VOTER SETUP — Freelance Marketplace    ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // --- Provider & Program ---
  const connection = new Connection(RPC_URL, "confirmed");
  const deployerPath = path.resolve(__dirname, "../.keys/deployer.json");
  const deployerSecret = JSON.parse(fs.readFileSync(deployerPath, "utf-8"));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(deployerSecret));

  const wallet = new anchor.Wallet(deployer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load IDL from workspace
  const idl = JSON.parse(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "../target/idl/freelance_marketplace.json"
      ),
      "utf-8"
    )
  );
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  // --- Create voter keypairs ---
  fs.mkdirSync(VOTERS_DIR, { recursive: true });

  const voters: Keypair[] = [];
  for (let i = 0; i < NUM_VOTERS; i++) {
    const keyPath = path.join(VOTERS_DIR, `voter-${i}.json`);
    let kp: Keypair;
    if (fs.existsSync(keyPath)) {
      const raw = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
      kp = Keypair.fromSecretKey(Uint8Array.from(raw));
      console.log(`[Voter ${i}] Loaded existing keypair: ${kp.publicKey.toBase58()}`);
    } else {
      kp = Keypair.generate();
      fs.writeFileSync(keyPath, JSON.stringify(Array.from(kp.secretKey)));
      console.log(`[Voter ${i}] Generated new keypair: ${kp.publicKey.toBase58()}`);
    }
    voters.push(kp);
  }

  // --- Airdrop SOL to deployer (client role) and voters ---
  console.log("\n▸ Airdropping SOL to deployer and voters...");
  const deployerBal = await connection.getBalance(deployer.publicKey);
  if (deployerBal < 20 * LAMPORTS_PER_SOL) {
    try {
      await airdropAndConfirm(connection, deployer.publicKey, 5);
      console.log("  Deployer topped up with 5 SOL");
    } catch {
      console.log("  Deployer airdrop skipped (may be rate-limited)");
    }
  }

  for (let i = 0; i < voters.length; i++) {
    const bal = await connection.getBalance(voters[i].publicKey);
    if (bal < 2 * LAMPORTS_PER_SOL) {
      try {
        await airdropAndConfirm(connection, voters[i].publicKey, 3);
        console.log(`  Voter ${i} funded with 3 SOL`);
      } catch {
        console.log(`  Voter ${i} airdrop failed (rate-limited) — retry later`);
      }
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    } else {
      console.log(`  Voter ${i} already has sufficient balance`);
    }
  }

  // --- Initialize reputation for each voter ---
  console.log("\n▸ Initializing reputation accounts...");
  for (let i = 0; i < voters.length; i++) {
    const [repPda] = deriveReputationPDA(voters[i].publicKey);
    try {
      await program.methods
        .initializeReputation()
        .accounts({
          reputation: repPda,
          user: voters[i].publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voters[i]])
        .rpc();
      console.log(`  [Voter ${i}] Reputation initialized`);
    } catch (e: any) {
      if (e.toString().includes("already in use")) {
        console.log(`  [Voter ${i}] Reputation already exists — skipping`);
      } else {
        console.error(`  [Voter ${i}] Error: ${e.message}`);
      }
    }
  }

  // --- Initialize deployer reputation (needed as client to create reviews) ---
  const [deployerRepPda] = deriveReputationPDA(deployer.publicKey);
  try {
    await program.methods
      .initializeReputation()
      .accounts({
        reputation: deployerRepPda,
        user: deployer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("  Deployer reputation initialized");
  } catch {
    console.log("  Deployer reputation already exists — skipping");
  }

  // --- Build reputation: 5 job cycles per voter ---
  console.log(
    `\n▸ Building reputation (${REVIEWS_PER_VOTER} jobs per voter, ${NUM_VOTERS} voters)...`
  );
  console.log("  This will take a few minutes on devnet.\n");

  let jobCounter = 10000; // high number to avoid collisions with real jobs

  for (let vi = 0; vi < voters.length; vi++) {
    const voter = voters[vi];
    for (let cycle = 0; cycle < REVIEWS_PER_VOTER; cycle++) {
      const jobId = new anchor.BN(jobCounter++);
      try {
        // 1. Create job
        const [jobPda] = deriveJobPDA(deployer.publicKey, jobId);
        await program.methods
          .createJob(
            jobId,
            "Rep builder",
            "Quick task",
            new anchor.BN(0.01 * LAMPORTS_PER_SOL),
            "ipfs://QmRepSetup",
            null
          )
          .accounts({
            job: jobPda,
            client: deployer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // 2. Bid
        const [bidPda] = deriveBidPDA(jobPda, voter.publicKey);
        await program.methods
          .submitBid(
            new anchor.BN(0.01 * LAMPORTS_PER_SOL),
            "Done",
            1,
            null
          )
          .accounts({
            bid: bidPda,
            job: jobPda,
            freelancer: voter.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([voter])
          .rpc();

        // 3. Select bid
        await program.methods
          .selectBid()
          .accounts({
            job: jobPda,
            bid: bidPda,
            client: deployer.publicKey,
          })
          .rpc();

        // 4. Deposit escrow
        const [escrowPda] = deriveEscrowPDA(jobPda);
        await program.methods
          .depositEscrow(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
          .accounts({
            escrow: escrowPda,
            job: jobPda,
            client: deployer.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // 5. Submit work
        const [workPda] = deriveWorkPDA(jobPda);
        await program.methods
          .submitWork("ipfs://QmRepWork")
          .accounts({
            workSubmission: workPda,
            job: jobPda,
            freelancer: voter.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([voter])
          .rpc();

        // 6. Release escrow
        await program.methods
          .releaseEscrow()
          .accounts({
            escrow: escrowPda,
            job: jobPda,
            freelancer: voter.publicKey,
            client: deployer.publicKey,
          })
          .rpc();

        // 7. Review voter (5 stars)
        const [reviewPda] = deriveReviewPDA(jobPda, deployer.publicKey);
        const [voterRepPda] = deriveReputationPDA(voter.publicKey);
        await program.methods
          .submitReview(5, "Great job")
          .accounts({
            review: reviewPda,
            job: jobPda,
            revieweeReputation: voterRepPda,
            reviewer: deployer.publicKey,
            reviewee: voter.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        process.stdout.write(`  [Voter ${vi}] Job cycle ${cycle + 1}/${REVIEWS_PER_VOTER} ✔\n`);
      } catch (e: any) {
        console.error(`  [Voter ${vi}] Cycle ${cycle + 1} FAILED: ${e.message}`);
      }
    }

    // Verify final reputation
    const [repPda] = deriveReputationPDA(voter.publicKey);
    const rep = await program.account.reputation.fetch(repPda);
    console.log(
      `  [Voter ${vi}] Final: rating=${rep.averageRating}, reviews=${rep.totalReviews}, jobs=${rep.completedJobs}`
    );
    console.log();
  }

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║           SETUP COMPLETE — VOTERS READY         ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\nVoter keypairs saved to: ${VOTERS_DIR}`);
  console.log("You can now run: npx ts-node scripts/simulate-community-vote.ts <JOB_ADDRESS>");
}

main().catch(console.error);
