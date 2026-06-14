# Chapter 25: Migration Playbooks

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-25) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/migration-playbooks.md`, `patterns/platform-assessment.md`, `patterns/r2-object-storage.md`, `patterns/bindings-storage.md`

---

## One-line thesis

Migration is a **means**, not a goal — coexistence, incrementality, reversibility, and measured baselines distinguish experiments from bets.

---

## Core principles

1. **Coexistence before cutover** — old + new parallel; compare results
2. **Incremental over atomic** — one service/store/capability at a time
3. **Reversibility required** — keep rollback path 30+ days (explicit sunset)
4. **Observation** — baseline p50/p95/p99, errors, cost **before** moving traffic

"Lower latency" isn't a metric — "p99 450ms → 120ms" is.

---

## Zero-downtime architecture

**Strangler fig Worker** — proxy all traffic to legacy; migrate endpoints one-by-one via KV toggles (`isMigrated(path)`).

**Gradual deployments** — 0.05% → 0.5% → 3% → 10% → 25% → 50% → 75% → 100% with soak; edge split in **seconds** (not DNS TTL).

**Bridge infrastructure:**

- **Tunnel** — reach private VPC without inbound ports
- **VPC Services** — binding-scoped endpoint (SSRF-safe)
- **Hyperdrive** — Postgres/MySQL stays put; compute migrates around it (**valid permanent architecture**)
- **Smart Placement** — Worker near legacy DB during transition; disable when backends are edge-native

---

## Phased approach

1. **Edge** — Cloudflare in front (proxy/DDoS/analytics); control point
2. **Storage** — Sippy on R2 ← S3; Super Slurper for long tail
3. **Compute** — strangler + gradual rollout; Smart Placement
4. **Data (optional)** — Hyperdrive first; dual-write to D1 only if justified
5. **Decommission** — 30-day dormant rollback window

Each phase independently valuable — can stop at Hyperdrive + Workers permanently.

---

## Playbook highlights

### S3 → R2

- **Super Slurper** — bulk copy; watch egress $
- **Sippy** — on-demand; cheap for long tail
- Sequence: Sippy **before** endpoint switch → point app at R2 → Super Slurper skip-existing → disable Sippy
- ETag/multipart differences; no Object Lock; recreate IAM as R2 tokens

### Lambda → Workers

Blockers: >128 MB RAM, >30s HTTP CPU, VPC-native patterns, AWS-only triggers.

Process: translate handler → replace SDK with bindings → preview → gradual deploy → keep Lambda warm 2–4 weeks.

I/O-heavy: Workers CPU billing often wins; compute-heavy may not.

### Vercel/Netlify → Workers

Explicit `wrangler.toml`; framework adapters (OpenNext, SvelteKit, etc.). Don't migrate for "progress" — need DO, global edge, or proven cost win.

### Database

**Keep Hyperdrive when:** Postgres works, >10 GB, PostGIS/procs, multi-app DB, compliance.

**D1 when:** edge-native, <10 GB per partition, horizontal DB-per-tenant fits.

**Dual-write zero-downtime:** write both, read old → backfill → gradual read switch → remove dual-write.

Data migration **follows** compute migration — often 3× effort of compute alone.

### Redis → KV/DO

Decompose by role: cache→KV, sessions→KV/DO, counters/rate limits→DO, pub/sub→Queues/WS.

KV ≠ Redis: **1 write/sec/key**; eventual consistency ~60s.

Cache: KV-first organic fill. Rate limit transition: enforce **more restrictive** of both systems.

### SQS → Queues

Dual-publish; idempotent consumers; no FIFO — DO per entity for ordering; 128 KB limit → R2 claim-check.

### Step Functions → Workflows

ASL → TypeScript `step.do()`; running executions finish on old system; new on Workflows.

---

## Anti-patterns

- Feature parity gate
- Big-bang cutover
- Parallel run without comparison metrics
- "While migrating, rebuild X"
- Data migration before compute proven on Hyperdrive

---

## Recommended default path

1. Cloudflare proxy + Tunnel to fleet (phase 1 — likely done)
2. Edge API Worker + Hyperdrive → Postgres (hybrid permanent)
3. Strangler specific endpoints (auth, cache, webhooks)
4. R2 for audit/exports via Sippy if migrating from S3
5. **Do not** move payment SSOT to D1 — Hyperdrive stays

---

## Key quotes

> "Migration without metrics is hope, not engineering."

> "Start with the proxy Worker before migrating anything."

> "Hyperdrive with external PostgreSQL is a valid permanent architecture, not a stepping stone."
