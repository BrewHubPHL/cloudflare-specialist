# Chapter 11: Choosing the Right Storage

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-11) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/bindings-storage.md`, `patterns/cost-modelling.md`, `AGENTS.md` decision tree

---

## One-line thesis

No single 100 GB database — **specialise primitives** to access pattern; start sharded (many small things), not scale-up then shard.

---

## Five primitives

| Primitive | Trade-off | Mental model |
|-----------|-----------|--------------|
| **KV** | Global fast reads; ~60s eventual writes | Edge cache / config |
| **D1** | SQL + strong consistency; 10 GB **per DB** | Many small relational DBs |
| **R2** | Objects; zero egress; no queries | Files + CDN |
| **DO SQLite** | Per-entity coordination + storage | Actor state |
| **Hyperdrive** | External Postgres/MySQL accelerated | **Permanent OK** |

D1 = DO + Worker proxy + SQLite underneath.

---

## Three questions (in order)

1. **Access pattern** — read-heavy rare writes → KV; relational queries → D1; blobs → R2
2. **Consistency** — read-after-write critical → not KV; counters/balances → not KV alone
3. **Coordination** — atomic read-modify-write → DO (not D1 transactions alone)

---

## Common mappings

| Data | Store |
|------|-------|
| Feature flags / config | KV |
| Sessions (consumer) | KV (+ TTL); banking → DO |
| Profiles, orders, relations | D1 or Hyperdrive Postgres |
| Files | R2 (+ metadata in D1/Postgres) |
| Rate limits / counters | DO |
| Live chat/presence | DO + WebSocket |

---

## "Just use Postgres" (Hyperdrive)

Legitimate permanent architecture when: PostGIS/procs/extensions, multi-app DB, team ops on Postgres, compliance, uncertain → start Hyperdrive.

D1 when: greenfield, global read replicas, managed entirely on Cloudflare, natural DB-per-tenant.

**Recommendation:** Hyperdrive → fleet Postgres SSOT; D1 not payment ledger.

---

## Combining stores

- KV config + D1/Hyperdrive app data
- D1 metadata + R2 bytes (presigned delivery)
- DO live state → periodic flush to D1/Postgres for history
- KV cache in front of D1 (clear ownership: D1 authoritative)

---

## Mismatch failure names

| Failure | Symptom | Fix |
|---------|---------|-----|
| Consistency collision | Paid but KV still shows free | D1/Postgres |
| Coordination gap | Rate limit 100 exceeded at 101 | DO |
| Query impedance | Can't query KV keys | D1 |
| Blob bloat | 50 MB in D1 | R2 |
| Partition avoidance | One 10 GB D1 | DB-per-tenant |

---

## Cost signals

KV write-heavy → wrong store. D1 unindexed scans → $$$. R2 egress $0 vs S3.

---

## Key quotes

> "If you're asking how to make D1 store more than 10 GB, you're asking the wrong question."

> "Hyperdrive is a valid long-term architecture, not merely a bridge."

> "One store is authoritative; others are caches or derivatives."
