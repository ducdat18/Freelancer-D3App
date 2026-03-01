/**
 * ============================================================
 *  SIMULATE COMMUNITY VOTE — Run DURING your live demo
 * ============================================================
 *
 *  This script loads the pre-initialized voter keypairs from
 *  .keys/voters/ and casts votes on a specific dispute.
 *
 *  Prerequisites:
 *    1. You have already run: npx ts-node scripts/setup-demo-voters.ts
 *    2. A job exists on-chain with an OPEN dispute
 *
 *  Usage:
 *    npx ts-node scripts/simulate-community-vote.ts <JOB_ADDRESS>
 *
 *  Options:
 *    --for-client     Vote in favour of the client  (default: freelancer)
 *    --count=N        Use only N voters (default: all available)
 *    --delay=MS       Delay between votes in ms (default: 1500)
 *    --resolve        Also resolve the dispute after voting
 *
 *  Examples:
 *    npx ts-node scripts/simulate-community-vote.ts 7xKX...abc
 *    npx ts-node scripts/simulate-community-vote.ts 7xKX...abc --for-client --count=7
 *    npx ts-node scripts/simulate-community-vote.ts 7xKX...abc --resolve --delay=2000
 * ============================================================
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Connection,
  clusterApiUrl,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// ── Config ──────────────────────────────────────────────────
const PROGRAM_ID = new PublicKey(
  "FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i"
);
const VOTERS_DIR = path.resolve(__dirname, "../.keys/voters");
const RPC_URL =
  process.env.ANCHOR_PROVIDER_URL || clusterApiUrl("devnet");

// ── PDA Helpers ─────────────────────────────────────────────
function deriveDisputePDA(job: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dispute"), job.toBuffer()],
    PROGRAM_ID
  );
}
function deriveVoteRecordPDA(
  dispute: PublicKey,
  voter: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), dispute.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
}
function deriveReputationPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), user.toBuffer()],
    PROGRAM_ID
  );
}
function deriveEscrowPDA(job: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), job.toBuffer()],
    PROGRAM_ID
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Parse CLI Args ──────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error("Usage: npx ts-node scripts/simulate-community-vote.ts <JOB_ADDRESS> [options]");
    console.error("\nOptions:");
    console.error("  --for-client   Vote for client (default: freelancer)");
    console.error("  --count=N      Number of voters to use");
    console.error("  --delay=MS     Delay between votes (default: 1500)");
    console.error("  --resolve      Also resolve the dispute after voting");
    process.exit(1);
  }

  const jobAddress = args[0];
  const forClient = args.includes("--for-client");
  const resolve = args.includes("--resolve");

  let count = 0; // 0 = all available
  let delay = 1500;

  for (const arg of args) {
    if (arg.startsWith("--count=")) count = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--delay=")) delay = parseInt(arg.split("=")[1], 10);
  }

  return { jobAddress, forClient, count, delay, resolve };
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const { jobAddress, forClient, count, delay, resolve } = parseArgs();

  console.log();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║    COMMUNITY VOTE SIMULATION — Live Demo        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
  console.log(`  Job Address:   ${jobAddress}`);
  console.log(`  Voting for:    ${forClient ? "CLIENT" : "FREELANCER"}`);
  console.log(`  Vote delay:    ${delay}ms between votes`);
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

  // --- Load voter keypairs ---
  if (!fs.existsSync(VOTERS_DIR)) {
    console.error("ERROR: Voter keypairs not found. Run setup-demo-voters.ts first.");
    process.exit(1);
  }

  const voterFiles = fs
    .readdirSync(VOTERS_DIR)
    .filter((f) => f.startsWith("voter-") && f.endsWith(".json"))
    .sort();

  const voters: Keypair[] = voterFiles.map((f) => {
    const raw = JSON.parse(fs.readFileSync(path.join(VOTERS_DIR, f), "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  });

  const activeVoters = count > 0 ? voters.slice(0, count) : voters;
  console.log(`  Loaded ${activeVoters.length} voter keypairs\n`);

  // --- Derive dispute PDA ---
  const jobPda = new PublicKey(jobAddress);
  const [disputePda] = deriveDisputePDA(jobPda);

  // --- Verify dispute exists and is open ---
  let dispute: any;
  try {
    dispute = await program.account.dispute.fetch(disputePda);
  } catch {
    console.error("ERROR: No dispute found for this job.");
    console.error(`  Expected dispute PDA: ${disputePda.toBase58()}`);
    console.error("  Make sure you have opened a dispute on this job first.");
    process.exit(1);
  }

  if (dispute.status.open === undefined) {
    console.error("ERROR: Dispute is not open (already resolved).");
    console.error(`  Current status: ${JSON.stringify(dispute.status)}`);
    process.exit(1);
  }

  console.log(
    `  Dispute found! Current votes: Client=${dispute.votesForClient}, Freelancer=${dispute.votesForFreelancer}\n`
  );

  // --- Cast votes ---
  console.log("──────────────── CASTING VOTES ────────────────────\n");

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < activeVoters.length; i++) {
    const voter = activeVoters[i];
    const [voteRecordPda] = deriveVoteRecordPDA(disputePda, voter.publicKey);
    const [voterRepPda] = deriveReputationPDA(voter.publicKey);

    // Check if already voted
    try {
      await program.account.voteRecord.fetch(voteRecordPda);
      console.log(
        `  [${i + 1}/${activeVoters.length}] Voter ${voter.publicKey.toBase58().slice(0, 8)}... ⏭  Already voted — skipping`
      );
      skipCount++;
      continue;
    } catch {
      // Not yet voted — good
    }

    try {
      const sig = await program.methods
        .voteDispute(!forClient) // vote_for_client is the param name
        .accounts({
          dispute: disputePda,
          voteRecord: voteRecordPda,
          voterReputation: voterRepPda,
          voter: voter.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();

      successCount++;
      const side = forClient ? "CLIENT" : "FREELANCER";
      console.log(
        `  [${i + 1}/${activeVoters.length}] Vote cast for ${side} ✔  (${voter.publicKey.toBase58().slice(0, 8)}...)  tx: ${sig.slice(0, 16)}...`
      );
    } catch (e: any) {
      console.log(
        `  [${i + 1}/${activeVoters.length}] Vote FAILED ✘  (${voter.publicKey.toBase58().slice(0, 8)}...)  ${e.message.slice(0, 80)}`
      );
    }

    // Dramatic delay for the live demo
    if (i < activeVoters.length - 1) {
      await sleep(delay);
    }
  }

  // --- Summary ---
  console.log("\n──────────────── VOTE SUMMARY ─────────────────────\n");
  const updatedDispute = await program.account.dispute.fetch(disputePda);
  console.log(`  Votes for CLIENT:     ${updatedDispute.votesForClient}`);
  console.log(`  Votes for FREELANCER: ${updatedDispute.votesForFreelancer}`);
  console.log(`  Total votes:          ${updatedDispute.votesForClient + updatedDispute.votesForFreelancer}`);
  console.log(`  New votes cast:       ${successCount}`);
  console.log(`  Already voted:        ${skipCount}`);

  const totalVotes =
    updatedDispute.votesForClient + updatedDispute.votesForFreelancer;

  if (totalVotes >= 5) {
    const winner =
      updatedDispute.votesForClient > updatedDispute.votesForFreelancer
        ? "CLIENT"
        : "FREELANCER";
    console.log(`\n  ★ Quorum reached! Winner: ${winner}`);
    console.log("  → Dispute can be resolved now.");

    // --- Optional: auto-resolve ---
    if (resolve) {
      console.log("\n──────────────── RESOLVING DISPUTE ────────────────\n");
      const [escrowPda] = deriveEscrowPDA(jobPda);

      try {
        const sig = await program.methods
          .resolveDispute()
          .accounts({
            dispute: disputePda,
            escrow: escrowPda,
            job: jobPda,
            client: updatedDispute.client,
            freelancer: updatedDispute.freelancer,
            resolver: deployer.publicKey,
          })
          .rpc();

        console.log(`  Dispute resolved! ✔  tx: ${sig.slice(0, 24)}...`);
        console.log(`  Funds sent to: ${winner}`);
      } catch (e: any) {
        console.error(`  Resolution failed: ${e.message}`);
      }
    }
  } else {
    console.log(`\n  ⏳ Need ${5 - totalVotes} more votes to reach quorum (minimum 5)`);
  }

  console.log();
  console.log("══════════════════════════════════════════════════════");
  console.log("  Done. Refresh your UI to see the updated state.");
  console.log("══════════════════════════════════════════════════════\n");
}

main().catch(console.error);
