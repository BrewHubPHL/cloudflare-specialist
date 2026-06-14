# Chapter 12: D1 — SQLite at the Edge

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-12) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/bindings-storage.md`, `anti-patterns.md`, `patterns/platform-assessment.md`

---

## One-line thesis

**D1 is a Durable Object with a SQL interface** — single-location, single-threaded, 10 GB max per database. Many small databases is the design, not a workaround.

---

## Three-way decision

| Choose | When |
|--------|------|
| **D1** | Natural data boundaries (per-tenant, per-user), greenfield on Cloudflare, zero DB ops, SQLite feature set sufficient |
| **Hyperdrive → Postgres/MySQL** | Partition >10 GB, PostGIS/stored procs/LISTEN-NOTIFY, existing Postgres works — **valid permanent architecture** |
| **Elsewhere** | Analytics at 100s GB (warehouse), blobs in R2, coordination counters in DO |

Recommended default: **Hyperdrive → fleet Postgres** for SSOT; D1 for edge-only relational slices if ever needed.

---

## Architecture (DO foundation)

- One D1 database = one DO in one location
- All writes → primary; no distributed write consensus
- ~100 QPS if 10 ms queries; ~10 QPS if 100 ms queries — **slow queries queue everything**
- Output gating applies: external call after D1 write waits until durable

---

## 10 GB model

- 50,000 databases × 10 GB = 500 TB addressable
- **Per-tenant isolation:** one customer's slow query can't block another's
- **Cross-tenant queries impossible** — aggregate in app or separate analytics store
- Schema migrations must roll out to **entire fleet** — build tooling early

### Monolithic trap

Single D1 for all SaaS customers → approaches 10 GB, one slow query blocks all, migration painful. Fix: **database per customer** from day one.

---

## Geographic placement

**Common mistake:** CI in us-east-1 creates all tenant DBs in North America → EU users see 100–150 ms queries.

Fixes:
- Provision from edge near user (signup Worker in user's region)
- Database-per-user: first request places DB near user

Monolithic shared DB cannot distribute geographically.

---

## Read replicas + sessions

- Replicas: eventual (~<1s), 5–20 ms reads vs 50–200 ms to distant primary
- **After write + immediate read:** `env.DB.withSession()` — read-your-writes in session
- **Cross-user consistency** (collab dashboards): replicas stale — use primary, DO, or different architecture

```typescript
const session = env.DB.withSession();
await session.prepare("UPDATE users SET name = ? WHERE id = ?")
  .bind(newName, userId).run();
const user = await session.prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId).first();
```

Default: sessions for authenticated user flows; non-session for dashboards/background.

---

## Performance & cost

- **Index everything hot** — SCAN vs INDEX can be 100×; unindexed = scaling ceiling
- Billing: rows read/written + storage (verify live pricing)
- Poor indexing: 200× read cost explosion at scale

```typescript
const results = await env.DB.batch([
  env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId),
  env.DB.prepare("SELECT * FROM orders WHERE user_id = ?").bind(userId),
]);
```

- **Optimistic concurrency** on writes — retry on conflict; frequent row contention → consider DO
- Read-only queries: auto-retry (May 2026); writes need idempotent retry logic

---

## SQLite limits (vs Postgres)

**Missing:** stored procedures, triggers, UDFs, materialized views, LISTEN/NOTIFY — move logic to Workers.

Types: UUID/TIMESTAMP/JSONB → TEXT/INTEGER + app validation.

---

## Time Travel (PITR)

- Restore any minute in last 30 days (paid) — always on, no extra fee
- `wrangler d1 time-travel restore` — pre-restore state kept as bookmark (undo restores)
- Long retention: export to R2 via Workflows

---

## Migration

- Not a drop-in Postgres swap — stored procs → Workers, pub/sub → redesign
- Parallel write + read compare during cutover
- **Often don't migrate:** Hyperdrive + existing Postgres is correct

---

## Promoted anti-patterns

- Single monolithic D1 for multi-tenant SaaS
- Provisioning all DBs from one CI region
- Full table scans on hot paths
- Cross-tenant reporting via N database fan-out without analytics pipeline
- Assuming D1 replaces an external Postgres SSOT
