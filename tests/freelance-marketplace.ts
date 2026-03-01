// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FreelanceMarketplace } from "../target/types/freelance_marketplace";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import { assert, expect } from "chai";

// ============================================================
//  HELPERS
// ============================================================

/** Airdrop SOL and wait for confirmation */
async function airdrop(
  connection: anchor.web3.Connection,
  to: PublicKey,
  sol: number
) {
  const sig = await connection.requestAirdrop(to, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

/** Derive a PDA with the standard seeds used by the program */
function deriveJobPDA(
  client: PublicKey,
  jobId: anchor.BN,
  programId: PublicKey
): [PublicKey, number] {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(BigInt(jobId.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("job"), client.toBuffer(), idBuf],
    programId
  );
}

function deriveBidPDA(
  job: PublicKey,
  freelancer: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bid"), job.toBuffer(), freelancer.toBuffer()],
    programId
  );
}

function deriveEscrowPDA(
  job: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), job.toBuffer()],
    programId
  );
}

function deriveWorkPDA(
  job: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("work"), job.toBuffer()],
    programId
  );
}

function deriveDisputePDA(
  job: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("dispute"), job.toBuffer()],
    programId
  );
}

function deriveVoteRecordPDA(
  dispute: PublicKey,
  voter: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), dispute.toBuffer(), voter.toBuffer()],
    programId
  );
}

function deriveReputationPDA(
  user: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), user.toBuffer()],
    programId
  );
}

function deriveReviewPDA(
  job: PublicKey,
  reviewer: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("review"), job.toBuffer(), reviewer.toBuffer()],
    programId
  );
}

/** Global auto-incrementing job counter (avoids PDA collisions) */
let globalJobCounter = 1;

/**
 * Run one complete job-cycle so that the `freelancer` keypair earns
 * 1 completed-job credit and a 5-star review from `client`.
 *
 * Returns the jobPda used.
 */
async function runFullJobCycle(
  program: Program<FreelanceMarketplace>,
  client: Keypair,
  freelancer: Keypair
): Promise<PublicKey> {
  const programId = program.programId;
  const jobId = new anchor.BN(globalJobCounter++);

  // 1. Create Job
  const [jobPda] = deriveJobPDA(client.publicKey, jobId, programId);
  await program.methods
    .createJob(
      jobId,
      "Reputation Builder Job",
      "Quick task for reputation",
      new anchor.BN(0.01 * LAMPORTS_PER_SOL),
      "ipfs://QmRepBuild",
      null // SOL payment
    )
    .accounts({
      job: jobPda,
      client: client.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([client])
    .rpc();

  // 2. Submit Bid
  const [bidPda] = deriveBidPDA(jobPda, freelancer.publicKey, programId);
  await program.methods
    .submitBid(
      new anchor.BN(0.01 * LAMPORTS_PER_SOL),
      "I can do this",
      1, // timeline_days
      null // cv_uri
    )
    .accounts({
      bid: bidPda,
      job: jobPda,
      freelancer: freelancer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc();

  // 3. Select Bid
  await program.methods
    .selectBid()
    .accounts({
      job: jobPda,
      bid: bidPda,
      client: client.publicKey,
    })
    .signers([client])
    .rpc();

  // 4. Deposit Escrow
  const [escrowPda] = deriveEscrowPDA(jobPda, programId);
  await program.methods
    .depositEscrow(new anchor.BN(0.01 * LAMPORTS_PER_SOL))
    .accounts({
      escrow: escrowPda,
      job: jobPda,
      client: client.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([client])
    .rpc();

  // 5. Submit Work
  const [workPda] = deriveWorkPDA(jobPda, programId);
  await program.methods
    .submitWork("ipfs://QmWork123")
    .accounts({
      workSubmission: workPda,
      job: jobPda,
      freelancer: freelancer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([freelancer])
    .rpc();

  // 6. Release Escrow (completes job)
  await program.methods
    .releaseEscrow()
    .accounts({
      escrow: escrowPda,
      job: jobPda,
      freelancer: freelancer.publicKey,
      client: client.publicKey,
    })
    .signers([client])
    .rpc();

  // 7. Client reviews freelancer (5 stars)
  const [reviewPda] = deriveReviewPDA(jobPda, client.publicKey, programId);
  const [freelancerRepPda] = deriveReputationPDA(
    freelancer.publicKey,
    programId
  );
  await program.methods
    .submitReview(5, "Great work")
    .accounts({
      review: reviewPda,
      job: jobPda,
      revieweeReputation: freelancerRepPda,
      reviewer: client.publicKey,
      reviewee: freelancer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([client])
    .rpc();

  return jobPda;
}

// ============================================================
//  TEST SUITE 1 — HAPPY PATH  (Post → Bid → Escrow → Complete)
// ============================================================

describe("freelance-marketplace – happy path", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .FreelanceMarketplace as Program<FreelanceMarketplace>;
  const programId = program.programId;

  const client = Keypair.generate();
  const freelancer = Keypair.generate();
  const jobId = new anchor.BN(100);

  let jobPda: PublicKey;
  let bidPda: PublicKey;
  let escrowPda: PublicKey;

  // ---- Setup ----
  before(async () => {
    await airdrop(provider.connection, client.publicKey, 10);
    await airdrop(provider.connection, freelancer.publicKey, 5);
  });

  // ---- Reputation init ----
  it("Initializes reputation for client and freelancer", async () => {
    for (const kp of [client, freelancer]) {
      const [repPda] = deriveReputationPDA(kp.publicKey, programId);
      await program.methods
        .initializeReputation()
        .accounts({
          reputation: repPda,
          user: kp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([kp])
        .rpc();

      const rep = await program.account.reputation.fetch(repPda);
      assert.equal(rep.totalReviews, 0);
      assert.equal(rep.averageRating, 0);
    }
  });

  // ---- Create Job ----
  it("Client creates a job", async () => {
    [jobPda] = deriveJobPDA(client.publicKey, jobId, programId);

    await program.methods
      .createJob(
        jobId,
        "Logo Design Project",
        "Need a modern logo for tech startup",
        new anchor.BN(1 * LAMPORTS_PER_SOL),
        "ipfs://QmTest123",
        null
      )
      .accounts({
        job: jobPda,
        client: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const job = await program.account.job.fetch(jobPda);
    assert.ok(job.client.equals(client.publicKey));
    assert.equal(job.title, "Logo Design Project");
    assert.equal(job.budget.toString(), (1 * LAMPORTS_PER_SOL).toString());
    assert.ok(job.status.open !== undefined, "Job should be Open");
    assert.equal(job.bidCount, 0);
  });

  // ---- Submit Bid ----
  it("Freelancer submits a bid", async () => {
    [bidPda] = deriveBidPDA(jobPda, freelancer.publicKey, programId);

    await program.methods
      .submitBid(
        new anchor.BN(0.8 * LAMPORTS_PER_SOL),
        "I can create a stunning logo with 3 revisions",
        7,
        null
      )
      .accounts({
        bid: bidPda,
        job: jobPda,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    const bid = await program.account.bid.fetch(bidPda);
    assert.ok(bid.job.equals(jobPda));
    assert.ok(bid.freelancer.equals(freelancer.publicKey));
    assert.ok(bid.status.pending !== undefined, "Bid should be Pending");

    const job = await program.account.job.fetch(jobPda);
    assert.equal(job.bidCount, 1);
  });

  // ---- Select Bid ----
  it("Client selects the winning bid", async () => {
    await program.methods
      .selectBid()
      .accounts({
        job: jobPda,
        bid: bidPda,
        client: client.publicKey,
      })
      .signers([client])
      .rpc();

    const job = await program.account.job.fetch(jobPda);
    assert.ok(
      job.selectedFreelancer.equals(freelancer.publicKey),
      "Freelancer should be assigned"
    );
    assert.ok(job.status.inProgress !== undefined, "Job should be InProgress");
  });

  // ---- Deposit Escrow ----
  it("Client deposits escrow", async () => {
    [escrowPda] = deriveEscrowPDA(jobPda, programId);

    await program.methods
      .depositEscrow(new anchor.BN(1 * LAMPORTS_PER_SOL))
      .accounts({
        escrow: escrowPda,
        job: jobPda,
        client: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.ok(escrow.locked, "Escrow should be locked");
    assert.ok(!escrow.released, "Escrow should not be released");
    assert.ok(!escrow.disputed, "Escrow should not be disputed");
    assert.equal(
      escrow.amount.toString(),
      (1 * LAMPORTS_PER_SOL).toString()
    );
  });

  // ---- Submit Work ----
  it("Freelancer submits work", async () => {
    const [workPda] = deriveWorkPDA(jobPda, programId);

    await program.methods
      .submitWork("ipfs://QmDeliverable456")
      .accounts({
        workSubmission: workPda,
        job: jobPda,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    const work = await program.account.workSubmission.fetch(workPda);
    assert.ok(work.job.equals(jobPda));
    assert.equal(work.deliverableUri, "ipfs://QmDeliverable456");
    assert.ok(!work.approved, "Work should not be auto-approved");
  });

  // ---- Release Escrow (Client approves) ----
  it("Client approves work and releases escrow → funds go to freelancer", async () => {
    const balBefore = await provider.connection.getBalance(
      freelancer.publicKey
    );

    await program.methods
      .releaseEscrow()
      .accounts({
        escrow: escrowPda,
        job: jobPda,
        freelancer: freelancer.publicKey,
        client: client.publicKey,
      })
      .signers([client])
      .rpc();

    const balAfter = await provider.connection.getBalance(
      freelancer.publicKey
    );
    assert.ok(
      balAfter > balBefore,
      "Freelancer balance should increase after payment"
    );

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.ok(escrow.released, "Escrow should be released");
    assert.ok(!escrow.locked, "Escrow should be unlocked");

    const job = await program.account.job.fetch(jobPda);
    assert.ok(job.status.completed !== undefined, "Job should be Completed");
  });

  // ---- Reviews ----
  it("Client reviews freelancer (5 stars)", async () => {
    const [reviewPda] = deriveReviewPDA(jobPda, client.publicKey, programId);
    const [repPda] = deriveReputationPDA(freelancer.publicKey, programId);

    await program.methods
      .submitReview(5, "Excellent work! Highly recommended")
      .accounts({
        review: reviewPda,
        job: jobPda,
        revieweeReputation: repPda,
        reviewer: client.publicKey,
        reviewee: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const rep = await program.account.reputation.fetch(repPda);
    assert.equal(rep.totalReviews, 1);
    assert.equal(rep.averageRating, 5.0);
    assert.equal(rep.completedJobs, 1);
  });

  it("Freelancer reviews client (5 stars)", async () => {
    const [reviewPda] = deriveReviewPDA(
      jobPda,
      freelancer.publicKey,
      programId
    );
    const [repPda] = deriveReputationPDA(client.publicKey, programId);

    await program.methods
      .submitReview(5, "Great client, clear requirements")
      .accounts({
        review: reviewPda,
        job: jobPda,
        revieweeReputation: repPda,
        reviewer: freelancer.publicKey,
        reviewee: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    const rep = await program.account.reputation.fetch(repPda);
    assert.equal(rep.totalReviews, 1);
    assert.equal(rep.averageRating, 5.0);
  });
});

// ============================================================
//  TEST SUITE 2 — DISPUTE FLOW  (Post → Submit → Dispute →
//                  5 Voters → Resolve → Freelancer wins)
// ============================================================

describe("freelance-marketplace – dispute resolution flow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .FreelanceMarketplace as Program<FreelanceMarketplace>;
  const programId = program.programId;

  // Main actors
  const client = Keypair.generate();
  const freelancer = Keypair.generate();

  // 5 voters who will arbitrate
  const voters: Keypair[] = Array.from({ length: 5 }, () =>
    Keypair.generate()
  );

  // Disputed-job state
  const disputedJobId = new anchor.BN(200);
  let disputedJobPda: PublicKey;
  let escrowPda: PublicKey;
  let disputePda: PublicKey;

  // ---- Fund all accounts ----
  before(async () => {
    console.log("    Funding client, freelancer, and 5 voter accounts...");
    // Fund main actors
    await airdrop(provider.connection, client.publicKey, 50);
    await airdrop(provider.connection, freelancer.publicKey, 5);

    // Fund voters (they need SOL to pay for reputation-building tx fees)
    for (const v of voters) {
      await airdrop(provider.connection, v.publicKey, 5);
    }
  });

  // ---- Initialize reputation for ALL participants ----
  it("Initializes reputation for client, freelancer, and all 5 voters", async () => {
    const allKps = [client, freelancer, ...voters];
    for (const kp of allKps) {
      const [repPda] = deriveReputationPDA(kp.publicKey, programId);
      await program.methods
        .initializeReputation()
        .accounts({
          reputation: repPda,
          user: kp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([kp])
        .rpc();
    }
    console.log("    ✔ 7 reputation accounts initialized");
  });

  // ---- Bootstrap voter reputations (5 completed jobs each → 5 reviews) ----
  it("Builds reputation for 5 voters (5 job cycles each → rating 5.0, 5 reviews)", async () => {
    console.log(
      "    Building voter reputations (25 job cycles total)..."
    );

    for (let vi = 0; vi < voters.length; vi++) {
      const voter = voters[vi];
      for (let cycle = 0; cycle < 5; cycle++) {
        // client posts job, voter completes it, client gives 5★
        await runFullJobCycle(program, client, voter);
      }

      // Verify
      const [repPda] = deriveReputationPDA(voter.publicKey, programId);
      const rep = await program.account.reputation.fetch(repPda);
      assert.equal(rep.totalReviews, 5, `Voter ${vi} should have 5 reviews`);
      assert.equal(
        rep.averageRating,
        5.0,
        `Voter ${vi} should have 5.0 rating`
      );
      assert.equal(
        rep.completedJobs,
        5,
        `Voter ${vi} should have 5 completed jobs`
      );
      console.log(
        `    ✔ Voter ${vi + 1}/5 ready (5 reviews, 5.0 rating)`
      );
    }
  });

  // ---- Create the disputed job ----
  it("Client creates a disputed job and deposits escrow", async () => {
    // Create job
    [disputedJobPda] = deriveJobPDA(
      client.publicKey,
      disputedJobId,
      programId
    );
    await program.methods
      .createJob(
        disputedJobId,
        "Website Redesign",
        "Full website redesign project",
        new anchor.BN(2 * LAMPORTS_PER_SOL),
        "ipfs://QmDisputedJob",
        null
      )
      .accounts({
        job: disputedJobPda,
        client: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Freelancer bids
    const [bidPda] = deriveBidPDA(
      disputedJobPda,
      freelancer.publicKey,
      programId
    );
    await program.methods
      .submitBid(
        new anchor.BN(2 * LAMPORTS_PER_SOL),
        "I'll redesign the website",
        14,
        null
      )
      .accounts({
        bid: bidPda,
        job: disputedJobPda,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    // Select bid
    await program.methods
      .selectBid()
      .accounts({
        job: disputedJobPda,
        bid: bidPda,
        client: client.publicKey,
      })
      .signers([client])
      .rpc();

    // Deposit escrow
    [escrowPda] = deriveEscrowPDA(disputedJobPda, programId);
    await program.methods
      .depositEscrow(new anchor.BN(2 * LAMPORTS_PER_SOL))
      .accounts({
        escrow: escrowPda,
        job: disputedJobPda,
        client: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.ok(escrow.locked);
    assert.equal(escrow.amount.toString(), (2 * LAMPORTS_PER_SOL).toString());
    console.log("    ✔ Job created, bid selected, escrow deposited (2 SOL)");
  });

  // ---- Freelancer submits work ----
  it("Freelancer submits deliverables", async () => {
    const [workPda] = deriveWorkPDA(disputedJobPda, programId);
    await program.methods
      .submitWork("ipfs://QmDeliverableDisputed")
      .accounts({
        workSubmission: workPda,
        job: disputedJobPda,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    console.log("    ✔ Freelancer submitted work");
  });

  // ---- Client opens dispute ----
  it("Client opens a dispute", async () => {
    [disputePda] = deriveDisputePDA(disputedJobPda, programId);

    await program.methods
      .openDispute("Work does not match requirements")
      .accounts({
        dispute: disputePda,
        escrow: escrowPda,
        job: disputedJobPda,
        initiator: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    const dispute = await program.account.dispute.fetch(disputePda);
    assert.ok(
      dispute.status.open !== undefined,
      "Dispute should be Open"
    );
    assert.equal(dispute.votesForClient, 0);
    assert.equal(dispute.votesForFreelancer, 0);

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.ok(escrow.disputed, "Escrow should be flagged as disputed");

    const job = await program.account.job.fetch(disputedJobPda);
    assert.ok(job.status.disputed !== undefined, "Job should be Disputed");
    console.log("    ✔ Dispute opened");
  });

  // ---- 5 Voters cast "yes for freelancer" (vote_for_client = false) ----
  it("5 arbitrators vote in favour of freelancer", async () => {
    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      const [voteRecordPda] = deriveVoteRecordPDA(
        disputePda,
        voter.publicKey,
        programId
      );
      const [voterRepPda] = deriveReputationPDA(voter.publicKey, programId);

      await program.methods
        .voteDispute(false) // vote FOR freelancer
        .accounts({
          dispute: disputePda,
          voteRecord: voteRecordPda,
          voterReputation: voterRepPda,
          voter: voter.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();

      console.log(`    ✔ Voter ${i + 1}/5 cast vote for freelancer`);
    }

    const dispute = await program.account.dispute.fetch(disputePda);
    assert.equal(dispute.votesForFreelancer, 5, "Should have 5 votes for freelancer");
    assert.equal(dispute.votesForClient, 0, "Should have 0 votes for client");
  });

  // ---- Resolve dispute → freelancer gets the funds ----
  it("Dispute is resolved → freelancer receives escrowed funds", async () => {
    const freelancerBalBefore = await provider.connection.getBalance(
      freelancer.publicKey
    );

    await program.methods
      .resolveDispute()
      .accounts({
        dispute: disputePda,
        escrow: escrowPda,
        job: disputedJobPda,
        client: client.publicKey,
        freelancer: freelancer.publicKey,
        resolver: client.publicKey,
      })
      .signers([client])
      .rpc();

    const freelancerBalAfter = await provider.connection.getBalance(
      freelancer.publicKey
    );
    assert.ok(
      freelancerBalAfter > freelancerBalBefore,
      "Freelancer balance should increase after dispute resolution"
    );

    const dispute = await program.account.dispute.fetch(disputePda);
    assert.ok(
      dispute.status.resolvedFreelancer !== undefined,
      "Dispute should be ResolvedFreelancer"
    );
    assert.ok(
      dispute.resolvedAt !== null,
      "resolvedAt should be set"
    );

    const escrow = await program.account.escrow.fetch(escrowPda);
    assert.ok(escrow.released, "Escrow should be released");
    assert.ok(!escrow.locked, "Escrow should be unlocked");

    console.log("    ✔ Dispute resolved — freelancer received 2 SOL");
  });
});

// ============================================================
//  TEST SUITE 3 — ACCESS CONTROL & EDGE CASES
// ============================================================

describe("freelance-marketplace – access control", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .FreelanceMarketplace as Program<FreelanceMarketplace>;
  const programId = program.programId;

  const client = Keypair.generate();
  const freelancer = Keypair.generate();
  const stranger = Keypair.generate();
  const jobId = new anchor.BN(300);
  let jobPda: PublicKey;
  let bidPda: PublicKey;

  before(async () => {
    await airdrop(provider.connection, client.publicKey, 10);
    await airdrop(provider.connection, freelancer.publicKey, 5);
    await airdrop(provider.connection, stranger.publicKey, 2);

    // Init reputations
    for (const kp of [client, freelancer, stranger]) {
      const [repPda] = deriveReputationPDA(kp.publicKey, programId);
      await program.methods
        .initializeReputation()
        .accounts({
          reputation: repPda,
          user: kp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([kp])
        .rpc();
    }

    // Create job
    [jobPda] = deriveJobPDA(client.publicKey, jobId, programId);
    await program.methods
      .createJob(
        jobId,
        "Access Control Test Job",
        "Testing unauthorized actions",
        new anchor.BN(1 * LAMPORTS_PER_SOL),
        "ipfs://QmACTest",
        null
      )
      .accounts({
        job: jobPda,
        client: client.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Freelancer bids
    [bidPda] = deriveBidPDA(jobPda, freelancer.publicKey, programId);
    await program.methods
      .submitBid(
        new anchor.BN(0.9 * LAMPORTS_PER_SOL),
        "I'll do it",
        5,
        null
      )
      .accounts({
        bid: bidPda,
        job: jobPda,
        freelancer: freelancer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();
  });

  it("Stranger cannot select a bid (not the client)", async () => {
    try {
      await program.methods
        .selectBid()
        .accounts({
          job: jobPda,
          bid: bidPda,
          client: stranger.publicKey,
        })
        .signers([stranger])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (err: any) {
      assert.ok(
        err.toString().includes("Unauthorized") ||
          err.toString().includes("Error"),
        "Should fail with Unauthorized"
      );
    }
  });

  it("Bid cannot exceed job budget", async () => {
    const overBidder = Keypair.generate();
    await airdrop(provider.connection, overBidder.publicKey, 2);

    const [overBidPda] = deriveBidPDA(
      jobPda,
      overBidder.publicKey,
      programId
    );
    try {
      await program.methods
        .submitBid(
          new anchor.BN(2 * LAMPORTS_PER_SOL), // exceeds 1 SOL budget
          "Over-budget bid",
          3,
          null
        )
        .accounts({
          bid: overBidPda,
          job: jobPda,
          freelancer: overBidder.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([overBidder])
        .rpc();
      assert.fail("Should have thrown BidExceedsBudget");
    } catch (err: any) {
      assert.ok(
        err.toString().includes("BidExceedsBudget") ||
          err.toString().includes("Error"),
        "Should fail because bid exceeds budget"
      );
    }
  });

  it("Stranger cannot cancel a job (not the client)", async () => {
    try {
      await program.methods
        .cancelJob()
        .accounts({
          job: jobPda,
          escrow: null,
          client: stranger.publicKey,
        })
        .signers([stranger])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (err: any) {
      assert.ok(
        err.toString().includes("Unauthorized") ||
          err.toString().includes("Error"),
        "Should fail with Unauthorized"
      );
    }
  });

  it("Client can cancel an open job", async () => {
    await program.methods
      .cancelJob()
      .accounts({
        job: jobPda,
        escrow: null,
        client: client.publicKey,
      })
      .signers([client])
      .rpc();

    const job = await program.account.job.fetch(jobPda);
    assert.ok(
      job.status.cancelled !== undefined,
      "Job should be Cancelled"
    );
  });

  it("Cannot bid on a cancelled job", async () => {
    const lateBidder = Keypair.generate();
    await airdrop(provider.connection, lateBidder.publicKey, 2);

    const [lateBidPda] = deriveBidPDA(
      jobPda,
      lateBidder.publicKey,
      programId
    );
    try {
      await program.methods
        .submitBid(
          new anchor.BN(0.5 * LAMPORTS_PER_SOL),
          "Late bid",
          3,
          null
        )
        .accounts({
          bid: lateBidPda,
          job: jobPda,
          freelancer: lateBidder.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([lateBidder])
        .rpc();
      assert.fail("Should have thrown JobNotOpen");
    } catch (err: any) {
      assert.ok(
        err.toString().includes("JobNotOpen") ||
          err.toString().includes("Error"),
        "Should fail because job is not open"
      );
    }
  });
});

// ============================================================
//  TEST SUITE 4 — CHAT SYSTEM
// ============================================================

describe("freelance-marketplace – chat system", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .FreelanceMarketplace as Program<FreelanceMarketplace>;

  const sender = Keypair.generate();
  const recipient = Keypair.generate();

  before(async () => {
    await airdrop(provider.connection, sender.publicKey, 2);
    await airdrop(provider.connection, recipient.publicKey, 1);
  });

  it("Sends an on-chain message", async () => {
    const messageId = new anchor.BN(1);
    const idBuf = Buffer.alloc(8);
    idBuf.writeBigUInt64LE(BigInt(1));

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("chat_message"),
        sender.publicKey.toBuffer(),
        recipient.publicKey.toBuffer(),
        idBuf,
      ],
      program.programId
    );

    await program.methods
      .sendMessage(recipient.publicKey, "Hello from the test!", messageId)
      .accounts({
        message: messagePda,
        sender: sender.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([sender])
      .rpc();

    const msg = await program.account.chatMessage.fetch(messagePda);
    assert.ok(msg.sender.equals(sender.publicKey));
    assert.ok(msg.recipient.equals(recipient.publicKey));
    assert.equal(msg.content, "Hello from the test!");
    assert.ok(!msg.read, "Message should start as unread");
  });

  it("Recipient marks message as read", async () => {
    const idBuf = Buffer.alloc(8);
    idBuf.writeBigUInt64LE(BigInt(1));

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("chat_message"),
        sender.publicKey.toBuffer(),
        recipient.publicKey.toBuffer(),
        idBuf,
      ],
      program.programId
    );

    await program.methods
      .markMessageRead()
      .accounts({
        message: messagePda,
        recipient: recipient.publicKey,
      })
      .signers([recipient])
      .rpc();

    const msg = await program.account.chatMessage.fetch(messagePda);
    assert.ok(msg.read, "Message should now be read");
  });
});
