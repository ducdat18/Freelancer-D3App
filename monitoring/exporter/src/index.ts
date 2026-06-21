import http from "node:http";
import {
  Connection,
  PublicKey,
  GetProgramAccountsFilter,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import bs58 from "bs58";
import client from "prom-client";
import idlJson from "./idl.json" with { type: "json" };

// ---------- config ----------
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID ?? "FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i"
);
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const POLL_INTERVAL_MS =
  (Number(process.env.POLL_INTERVAL_SEC ?? "30") || 30) * 1000;
const TX_LOOKBACK_LIMIT = Number(process.env.TX_LOOKBACK_LIMIT ?? "100") || 100;
const PORT = Number(process.env.PORT ?? "9464") || 9464;

const connection = new Connection(RPC_URL, "confirmed");
const idl = idlJson as unknown as Idl;
const coder = new BorshAccountsCoder(idl);

// Account types we care about (name → label for metric)
const ACCOUNT_TYPES: { name: string; label: string }[] = [
  { name: "Job", label: "job" },
  { name: "Bid", label: "bid" },
  { name: "Escrow", label: "escrow" },
  { name: "Milestone", label: "milestone" },
  { name: "MilestoneEscrow", label: "milestone_escrow" },
  { name: "KycRecord", label: "kyc" },
  { name: "ReputationSBT", label: "sbt" },
  { name: "Proposal", label: "proposal" },
];

// Instructions we want to surface as counters (the hot path)
const TRACKED_INSTRUCTIONS = [
  "create_job",
  "submit_bid",
  "select_bid",
  "cancel_job",
  "complete_job",
  "deposit_token_escrow",
  "release_token_escrow",
  "open_token_dispute",
  "submit_work",
  "approve_work",
  "init_job_milestones",
  "create_milestone",
  "fund_milestone",
  "approve_milestone",
  "submit_kyc",
  "finalize_kyc",
  "mint_reputation_sbt",
  "create_proposal",
  "cast_dao_vote",
];

// ---------- metrics ----------
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const pdaCount = new client.Gauge({
  name: "fc_pda_count",
  help: "Number of PDA accounts owned by the FreelanceChain program, by type.",
  labelNames: ["type"] as const,
  registers: [registry],
});

const jobsByStatus = new client.Gauge({
  name: "fc_jobs_by_status",
  help: "Number of Job PDAs by status.",
  labelNames: ["status"] as const,
  registers: [registry],
});

const escrowLockedSol = new client.Gauge({
  name: "fc_escrow_locked_sol",
  help: "Total SOL currently locked across Escrow + MilestoneEscrow PDAs.",
  registers: [registry],
});

const kycByStatus = new client.Gauge({
  name: "fc_kyc_by_status",
  help: "Number of KycRecord PDAs by status.",
  labelNames: ["status"] as const,
  registers: [registry],
});

const instructionCalls = new client.Counter({
  name: "fc_instruction_calls_total",
  help: "Cumulative count of program instructions observed in recent transactions.",
  labelNames: ["instruction", "result"] as const,
  registers: [registry],
});

const solanaSlot = new client.Gauge({
  name: "fc_solana_slot",
  help: "Current Solana slot reported by the RPC endpoint.",
  registers: [registry],
});

const solanaBlockHeight = new client.Gauge({
  name: "fc_solana_block_height",
  help: "Current Solana block height reported by the RPC endpoint.",
  registers: [registry],
});

const rpcErrors = new client.Counter({
  name: "fc_rpc_errors_total",
  help: "RPC errors observed during scrape, by operation.",
  labelNames: ["op"] as const,
  registers: [registry],
});

const lastSuccessfulPoll = new client.Gauge({
  name: "fc_last_successful_poll_timestamp",
  help: "Unix timestamp of the last successful end-to-end poll.",
  registers: [registry],
});

// Pre-initialise label combinations so Grafana panels show "0" instead of
// "No data" before the first observation lands. prom-client only exposes a
// label series after .inc / .set is called for that label tuple.
for (const ix of TRACKED_INSTRUCTIONS) {
  instructionCalls.inc({ instruction: ix, result: "success" }, 0);
  instructionCalls.inc({ instruction: ix, result: "failed" }, 0);
}
for (const op of [
  "chain_health",
  "jobs_by_status",
  "kyc_by_status",
  "tx_fetch",
  "signatures",
] as const) {
  rpcErrors.inc({ op }, 0);
}
for (const { label } of ACCOUNT_TYPES) {
  rpcErrors.inc({ op: `count_${label}` }, 0);
}
for (const name of ["Escrow", "MilestoneEscrow"] as const) {
  rpcErrors.inc({ op: `escrow_${name}` }, 0);
}
// Initialise the heartbeat gauge to "now" so `time() - fc_last_...` is
// well-behaved before the first poll completes.
lastSuccessfulPoll.set(Math.floor(Date.now() / 1000));

// ---------- helpers ----------
function accountDiscriminator(accountName: string): Buffer {
  const def = (idl as any).accounts?.find((a: any) => a.name === accountName);
  if (!def?.discriminator) {
    throw new Error(`Account ${accountName} not found or has no discriminator`);
  }
  return Buffer.from(def.discriminator as number[]);
}

function instructionDiscriminator(name: string): Buffer | null {
  const def = (idl.instructions as any[]).find((i) => i.name === name);
  if (!def) return null;
  return Buffer.from(def.discriminator as number[]);
}

// Build a lookup from 8-byte discriminator hex → instruction name
const ixDiscriminatorTable = new Map<string, string>();
for (const ixName of TRACKED_INSTRUCTIONS) {
  const d = instructionDiscriminator(ixName);
  if (d) ixDiscriminatorTable.set(d.toString("hex"), ixName);
}

// Track which tx signatures we've already counted
const seenSignatures = new Set<string>();
const SEEN_MAX = 5000;

async function pollChainHealth() {
  try {
    const [slot, height] = await Promise.all([
      connection.getSlot("confirmed"),
      connection.getBlockHeight("confirmed"),
    ]);
    solanaSlot.set(slot);
    solanaBlockHeight.set(height);
  } catch (err) {
    rpcErrors.inc({ op: "chain_health" });
    console.error("[chain_health]", err);
  }
}

async function pollAccountCounts() {
  for (const { name, label } of ACCOUNT_TYPES) {
    try {
      const disc = accountDiscriminator(name);
      const filters: GetProgramAccountsFilter[] = [
        { memcmp: { offset: 0, bytes: bs58.encode(disc) } },
      ];
      // dataSlice: empty payload — we only need the count
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        commitment: "confirmed",
        filters,
        dataSlice: { offset: 0, length: 0 },
      });
      pdaCount.set({ type: label }, accounts.length);
    } catch (err) {
      rpcErrors.inc({ op: `count_${label}` });
      console.error(`[count_${label}]`, err);
    }
  }
}

async function pollJobStatusBreakdown() {
  try {
    const disc = accountDiscriminator("Job");
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(disc) } }],
    });
    const tally: Record<string, number> = {};
    for (const acc of accounts) {
      try {
        const decoded: any = coder.decode("Job", acc.account.data);
        const status: string =
          typeof decoded.status === "string"
            ? decoded.status
            : Object.keys(decoded.status)[0] ?? "unknown";
        tally[status] = (tally[status] ?? 0) + 1;
      } catch {
        tally["decode_error"] = (tally["decode_error"] ?? 0) + 1;
      }
    }
    // Reset all known statuses to 0 before setting, so disappearing statuses go to zero
    for (const s of [
      "Open",
      "InProgress",
      "WaitingForReview",
      "Rejected",
      "Completed",
      "Disputed",
      "Cancelled",
      "decode_error",
    ]) {
      jobsByStatus.set({ status: s }, tally[s] ?? 0);
    }
  } catch (err) {
    rpcErrors.inc({ op: "jobs_by_status" });
    console.error("[jobs_by_status]", err);
  }
}

async function pollKycStatusBreakdown() {
  try {
    const disc = accountDiscriminator("KycRecord");
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(disc) } }],
    });
    const tally: Record<string, number> = {};
    for (const acc of accounts) {
      try {
        const decoded: any = coder.decode("KycRecord", acc.account.data);
        const status: string =
          typeof decoded.status === "string"
            ? decoded.status
            : Object.keys(decoded.status)[0] ?? "unknown";
        tally[status] = (tally[status] ?? 0) + 1;
      } catch {
        tally["decode_error"] = (tally["decode_error"] ?? 0) + 1;
      }
    }
    for (const s of ["Pending", "Verified", "Rejected", "decode_error"]) {
      kycByStatus.set({ status: s }, tally[s] ?? 0);
    }
  } catch (err) {
    rpcErrors.inc({ op: "kyc_by_status" });
    console.error("[kyc_by_status]", err);
  }
}

async function pollLockedEscrow() {
  let lamports = 0n;
  for (const name of ["Escrow", "MilestoneEscrow"] as const) {
    try {
      const disc = accountDiscriminator(name);
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        commitment: "confirmed",
        filters: [{ memcmp: { offset: 0, bytes: bs58.encode(disc) } }],
      });
      for (const acc of accounts) {
        try {
          const decoded: any = coder.decode(name, acc.account.data);
          if (decoded.locked && !decoded.released && !decoded.disputed) {
            lamports += BigInt(decoded.amount.toString());
          }
        } catch {
          /* skip */
        }
      }
    } catch (err) {
      rpcErrors.inc({ op: `escrow_${name}` });
      console.error(`[escrow_${name}]`, err);
    }
  }
  // 1 SOL = 1e9 lamports
  escrowLockedSol.set(Number(lamports) / 1e9);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollRecentTransactions() {
  let sigs: Awaited<ReturnType<Connection["getSignaturesForAddress"]>> = [];
  try {
    sigs = await connection.getSignaturesForAddress(PROGRAM_ID, {
      limit: TX_LOOKBACK_LIMIT,
    });
  } catch (err) {
    rpcErrors.inc({ op: "signatures" });
    console.error("[signatures]", err);
    return;
  }
  // Process oldest → newest so counters increase monotonically
  const unseen = sigs.filter((s) => !seenSignatures.has(s.signature)).reverse();
  for (const sig of unseen) {
    let tx: VersionedTransactionResponse | null = null;
    // Single retry with back-off on rate-limit
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        tx = (await connection.getTransaction(sig.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        })) as VersionedTransactionResponse | null;
        break;
      } catch (err) {
        if (attempt === 0) {
          await sleep(500);
        } else {
          rpcErrors.inc({ op: "tx_fetch" });
          tx = null;
        }
      }
    }
    if (!tx) continue;
    try {

        const result = sig.err ? "failed" : "success";
        const programIdStr = PROGRAM_ID.toBase58();
        const message: any = tx.transaction.message;
        const accountKeys = message
          .getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses })
          .keySegments()
          .flat()
          .map((k: PublicKey) => k.toBase58());

        const compiled: Array<{
          programIdIndex: number;
          data: Uint8Array | string;
        }> = message.compiledInstructions ?? message.instructions ?? [];

        for (const ix of compiled) {
          if (accountKeys[ix.programIdIndex] !== programIdStr) continue;
          const data =
            typeof ix.data === "string"
              ? Buffer.from(bs58.decode(ix.data))
              : Buffer.from(ix.data);
          if (data.length < 8) continue;
          const disc = data.subarray(0, 8).toString("hex");
          const ixName = ixDiscriminatorTable.get(disc);
          if (!ixName) continue;

          instructionCalls.inc({ instruction: ixName, result });
        }

      seenSignatures.add(sig.signature);
    } catch (err) {
      rpcErrors.inc({ op: "tx_parse" });
    }
  }
  // Trim memory
  if (seenSignatures.size > SEEN_MAX) {
    const overflow = seenSignatures.size - SEEN_MAX;
    const it = seenSignatures.values();
    for (let i = 0; i < overflow; i++) {
      const next = it.next();
      if (next.done) break;
      seenSignatures.delete(next.value);
    }
  }
}

async function pollOnce() {
  const startedAt = Date.now();
  await pollChainHealth();
  await pollAccountCounts();
  await pollJobStatusBreakdown();
  await pollKycStatusBreakdown();
  await pollLockedEscrow();
  await pollRecentTransactions();
  lastSuccessfulPoll.set(Math.floor(Date.now() / 1000));
  console.log(
    `[poll] done in ${(Date.now() - startedAt) / 1000}s; seen sigs=${seenSignatures.size}`
  );
}

function startPoller() {
  const loop = async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[poll] unhandled", err);
    } finally {
      setTimeout(loop, POLL_INTERVAL_MS);
    }
  };
  loop();
}

// ---------- HTTP ----------
const server = http.createServer(async (req, res) => {
  if (req.url === "/metrics") {
    try {
      const body = await registry.metrics();
      res.writeHead(200, { "Content-Type": registry.contentType });
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
    return;
  }
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(
    `fc-exporter
program=${PROGRAM_ID.toBase58()}
rpc=${RPC_URL}
poll_interval_ms=${POLL_INTERVAL_MS}
endpoints: /metrics /healthz
`
  );
});

server.listen(PORT, () => {
  console.log(
    `[boot] fc-exporter listening on :${PORT} program=${PROGRAM_ID.toBase58()} rpc=${RPC_URL}`
  );
  startPoller();
});
