# FreelanceChain — On-chain Observability

Lightweight monitoring stack for the FreelanceChain Anchor program.
Polls Solana Devnet directly via RPC, exposes Prometheus metrics, and ships a
pre-built Grafana dashboard.

## What it watches

| Metric | Source | Notes |
|---|---|---|
| `fc_solana_slot`, `fc_solana_block_height` | RPC `getSlot` / `getBlockHeight` | chain health |
| `fc_pda_count{type=...}` | `getProgramAccounts` + discriminator filter | Job/Bid/Escrow/Milestone/MilestoneEscrow/KycRecord/ReputationSBT/Proposal |
| `fc_jobs_by_status{status=...}` | decode each Job PDA | Open / InProgress / WaitingForReview / Rejected / Completed / Disputed / Cancelled |
| `fc_kyc_by_status{status=...}` | decode each KycRecord | Pending / Verified / Rejected |
| `fc_escrow_locked_sol` | sum `amount` of Escrow+MilestoneEscrow where `locked && !released && !disputed` | in SOL |
| `fc_instruction_calls_total{instruction, result}` | parse recent program transactions | success / failed |
| `fc_rpc_errors_total{op}` | per-operation counter | for alerting |
| `fc_last_successful_poll_timestamp` | poller heartbeat | alert if too old |

Read-only: the exporter never signs or sends transactions.

## Quick start

```bash
cd monitoring
docker compose up -d
```

Then open:

- Grafana → http://localhost:3001 (anonymous viewer; admin/admin to edit)
- Prometheus → http://localhost:9090
- Exporter metrics → http://localhost:9464/metrics
- Exporter health → http://localhost:9464/healthz

The Grafana dashboard `FreelanceChain — On-chain Observability` is auto-provisioned.

## Configuration

Environment variables (set in `docker-compose.yml` or via `.env`):

| Variable | Default | Meaning |
|---|---|---|
| `PROGRAM_ID` | `FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i` | Anchor program ID |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` | RPC endpoint |
| `POLL_INTERVAL_SEC` | `30` | how often to poll the chain |
| `TX_LOOKBACK_LIMIT` | `100` | recent signatures fetched per poll |
| `GRAFANA_USER` / `GRAFANA_PASSWORD` | `admin` / `admin` | Grafana admin login |

For higher throughput point `SOLANA_RPC_URL` at a private RPC (Helius, QuickNode);
the public endpoint is rate-limited.

## Running the exporter standalone (dev)

```bash
cd monitoring/exporter
npm install
SOLANA_RPC_URL=https://api.devnet.solana.com \
PROGRAM_ID=FStwCj8zLzNkz7gTavooDcqF4FSyDcF9o9SCh96yyP7i \
npm run dev
```

`/metrics` will be served on `:9464`.

## Notes for thesis observability subsection

- This stack is intentionally off-chain. It only reads public ledger state; the
  decentralization properties of the dApp are unchanged. Anyone can run their
  own instance of this monitor.
- Confirmation latency per instruction (Table 4.3 in the thesis) is currently
  measured offline through the test harness; the exporter does not attempt to
  re-derive submit→confirm time from public ledger data alone. Pushing precise
  client-side timing requires the dApp to instrument tx submission and forward
  to a Prometheus Pushgateway, which is left as a small future task.
- All "trust-critical" signals (escrow balance, KYC status, dispute outcomes)
  are derived from PDA decoding rather than off-chain events, so the dashboard
  remains consistent even if individual transactions are missed.
