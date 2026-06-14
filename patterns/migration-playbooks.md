# Migration Playbooks

**Impact:** CRITICAL  
**Tags:** migration, strangler-fig, hyperdrive, cutover  
**Book:** Ch.25 — `references/book-summaries/architecting-on-cloudflare-ch25-migration-playbooks.md`

Complements fit assessment in `platform-assessment.md` and when-not-to in Ch.24 summary.

---

## Principles (non-negotiable)

1. **Coexistence** — run old + new; compare outputs
2. **Incremental** — one endpoint, store, or queue at a time
3. **Reversible** — keep rollback 30 days after cutover (set sunset date)
4. **Measured** — baseline latency/errors/cost before moving traffic

Migration without numbers is hope, not engineering.

---

## Strangler fig (default pattern)

Deploy a Worker that proxies **everything** to legacy first — validates path, establishes metrics, adds <5ms overhead.

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (await isMigrated(url.pathname, env)) {
      return handleOnWorkers(request, env);
    }

    return fetch(`${env.LEGACY_ORIGIN}${url.pathname}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
  },
};
```

Toggle endpoints via KV — no redeploy to roll back a single path.

---

## Gradual deployment stages

Cloudflare internal pattern (adapt to traffic):

`0.05% → 0.5% → 3% → 10% → 25% → 50% → 75% → 100%`

Soak between stages. Edge split applies in **seconds** — not DNS TTL propagation.

Define rollback triggers **before** deploy: error rate 2× baseline, new 5xx signatures, p99 regression.

---

## Phased migration

| Phase | Action | Production note |
|-------|--------|--------------|
| 1 Edge | Cloudflare in front / proxy Worker | Tunnel to fleet likely exists |
| 2 Storage | Sippy + R2; Super Slurper long tail | Audit logs, exports |
| 3 Compute | Strangler + gradual rollout | API adapter, OpenNext |
| 4 Data | Hyperdrive first; dual-write only if moving to D1 | **Postgres SSOT stays** |
| 5 Decommission | 30-day dormant rollback | Keep read-only S3/Lambda briefly |

**Stopping at phase 3 + Hyperdrive is valid permanent architecture.**

---

## Bridge tools

| Tool | Role |
|------|------|
| **cloudflared Tunnel** | Private fleet/VPC without inbound ports — `zero-trust-tunnels.md` |
| **VPC Services** | Binding to one internal endpoint (SSRF-safe) |
| **Hyperdrive** | Pool Postgres/MySQL; compute migrates, DB stays |
| **Smart Placement** | Worker near legacy DB during transition; off when edge-native |

---

## Playbook: S3 → R2

1. Create R2 bucket; enable **Sippy** to S3 source
2. Point app at R2 endpoint (S3-compatible SDK)
3. **Super Slurper** `skip existing` for long tail
4. Validate counts/checksums; disable Sippy
5. Keep S3 read-only 30 days

Details: `r2-object-storage.md`

---

## Playbook: Lambda → Workers

**Blockers:** >128 MB RAM, >30s HTTP CPU, heavy native Node deps, AWS-only triggers without redesign.

Steps: translate handler → bindings replace SDK → `wrangler dev` → preview → gradual deploy → monitor geo latency shift → decommission Lambda after 2–4 weeks.

I/O orchestration often cheaper on Workers (CPU vs wall billing) — model your workload.

---

## Playbook: Postgres → stay on Postgres

**Default — do not migrate SSOT to D1.**

1. Edge Worker + **Hyperdrive** to Supabase pooler URI
2. Smart Placement while DB is single-region fleet
3. Strangler endpoints that benefit from edge (auth, cache, webhooks)
4. R2 for blobs; Queues for async; fleet Python via Tunnel for agents

Migrate to D1 only for **new edge-native slices** without money authority — not wholesale replacement.

---

## Playbook: Postgres → D1 (when justified)

Only when: edge-native, <10 GB per partition, SQLite features sufficient, horizontal DB-per-tenant fits.

**Dual-write sequence:**

1. Hyperdrive bridge (compute migrated, DB unchanged)
2. Dual-write: read Hyperdrive, write Hyperdrive + D1 shadow
3. Validate D1 writes 1–2 weeks
4. Backfill historical data
5. Gradual read switch (1% → … → 100%) with response comparison
6. Remove dual-write; decommission Hyperdrive when confident

Data migration often **3×** compute effort — follow compute, don't lead.

---

## Playbook: Redis → KV / DO

Audit usage by category:

| Redis use | Target |
|-----------|--------|
| Cache | KV (organic fill: KV-first, miss → source) |
| Sessions (staleness OK) | KV |
| Sessions (strong consistency) | DO |
| Counters / rate limits | DO |
| Pub/sub | Queues or DO + WebSocket |

KV: **1 write/sec/key** — not a Redis counter drop-in.

Rate-limit migration: enforce **stricter** of Redis and DO during overlap.

---

## Playbook: SQS → Queues

Dual-publish → validate counts → switch consumer → drain SQS.

Idempotent consumers mandatory. FIFO → DO serialiser per entity. >128 KB → R2 claim-check.

See `queues-cron.md`.

---

## Playbook: Step Functions → Workflows

Finish in-flight executions on AWS; new executions on Workflows. Map states to `step.do()` — see `workflows.md`.

---

## Migration anti-patterns

- Feature parity before any traffic
- Big-bang cutover
- Parallel systems without diff metrics
- Data migration before Hyperdrive path proven
- "While migrating, rebuild X"

---

## References

- [Ch.25 summary](../references/book-summaries/architecting-on-cloudflare-ch25-migration-playbooks.md)
- [Platform assessment](platform-assessment.md)
- [R2 patterns](r2-object-storage.md)
- [Hyperdrive](bindings-storage.md)
