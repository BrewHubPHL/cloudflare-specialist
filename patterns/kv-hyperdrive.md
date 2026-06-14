# KV & Hyperdrive

**Impact:** HIGH  
**Tags:** kv, hyperdrive, cache, postgres, connection-pooling  
**Book:** Ch.14 — [summary](../references/book-summaries/architecting-on-cloudflare-ch14-kv-hyperdrive.md)  
**Selection framework:** [bindings-storage.md](bindings-storage.md) (Ch.11)

---

## KV: CDN you can write to

Global sub-10ms reads; ~60s eventual propagation; **no coordination, no read-your-writes guarantee, no monotonic reads**.

```typescript
const config = await env.CONFIG.get("feature-flags", { type: "json", cacheTtl: 300 });
await env.CONFIG.put("session:token", JSON.stringify(session), { expirationTtl: 86400 });
```

| Parameter | Meaning |
|-----------|---------|
| `cacheTtl` | How long edge serves without re-checking coordination layer (min ~30s) |
| `expirationTtl` | When key is deleted |

Don't confuse them — common source of "stale forever" bugs.

### First question: how stale?

If user-visible data must reflect writes immediately → **not KV** (use D1, Hyperdrive Postgres, or DO).

### When KV wins

Feature flags, cached external API responses, session token lookup (read-heavy), rarely changing metadata.

### When KV fails

Counters, inventory, rate limits, shopping carts, profile saves users refresh immediately, write-heavy workloads (>~20% writes — compare D1 pricing).

### Named failure modes

- **Stale read after write** — return written value in response; don't re-read KV for confirmation
- **Negative caching** — absent key cached at edge; avoid existence-check correctness
- **Read skew** — simultaneous users in different cities see different values

### Invalidation truth

No reliable global invalidation. Design for **TTL + accepted staleness**. Cache-aside: read KV → miss → D1/Postgres → populate.

**Content-addressable keys:** hash content into key; update version pointer (DO for strong consistency) — immutable keys never "update," avoiding propagation races.

### Namespaces

Up to **1,000 namespaces/account** — split by concern (`CONFIG`, `SESSIONS`, `CACHE`) or per tenant for B2B offboarding (delete namespace).

### wrangler

```jsonc
{
  "kv_namespaces": [{ "binding": "CONFIG", "id": "<namespace-id>" }]
}
```

---

## Hyperdrive: geography tax once

Each cold Worker→Postgres connection from Sydney to us-east-1 can cost **400–600ms** before query execution. Hyperdrive maintains pools **near the database**; Workers connect to nearest Hyperdrive edge.

```jsonc
{
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<config-id>" }]
}
```

```typescript
import postgres from "postgres";

const sql = postgres(env.HYPERDRIVE.connectionString);
const rows = await sql`SELECT * FROM orders WHERE tenant_id = ${tenantId} LIMIT 50`;
```

Use **transaction pooler URI** (Supabase pooler) — see `supabase-specialist`.

### Permanent architecture (BrewHub SSOT)

Not a migration stepping stone only. Keep Postgres when: extensions, multi-app DB, team ops, RLS/compliance, >10 GB per partition.

Pair with **Smart Placement** when DB latency dominates.

### Transactions & pooling

Transaction holds dedicated pool connection until commit — keep transactions **seconds, not minutes**. Size pool to origin capacity (configurable, floor 5).

### Query caching (optional)

Identical parameterized queries may hit cache — **disable** for write-then-read paths and time-sensitive queries. Stale cache after write is a named failure mode.

### Multi-region replicas

One Hyperdrive config → one endpoint. For geo-distributed read replicas: **multiple Hyperdrive configs**, route reads to nearest replica; writes to primary.

### Failure modes

| Mode | Signal | Mitigation |
|------|--------|------------|
| Pool exhaustion | Stable p50, rising p99 | Shorter transactions; scale pool |
| Stale cache | Read old row after write | Disable cache for query |
| Credential rotation race | Auth failures mid-roll | Add new creds → update Hyperdrive → verify → remove old |
| Origin timeout cascade | DB slow, pool fills | Aggressive timeouts; circuit break |

TLS required — Hyperdrive refuses plaintext.

### vs RDS Proxy

RDS Proxy: same-region Lambda connection storms. Hyperdrive: **global Workers + pooling + optional query cache**.

---

## KV vs D1 vs Hyperdrive matrix

| Need | Store |
|------|-------|
| Config / flags, staleness OK | KV |
| Relational, greenfield, edge-native | D1 |
| Existing Postgres/MySQL | Hyperdrive |
| Atomic counter / rate limit | Durable Objects |

Hybrid: KV cache in front of D1/Postgres — **Postgres/D1 authoritative**, KV derivative.

---

## Monitoring

KV: application-level hit rate, unexpected miss spikes.

Hyperdrive: query duration percentiles (p99 >> p50 → pool pressure); separate connection errors from query errors.

---

## BrewHub

| Data | Store |
|------|-------|
| Feature flags, tenant config cache | KV + TTL |
| Orders, payments, inventory | Hyperdrive → fleet Postgres |
| Never | KV as entitlement SSOT |

---

## References

- [KV](https://developers.cloudflare.com/kv/)
- [Hyperdrive](https://developers.cloudflare.com/hyperdrive/)
- [bindings-storage.md](bindings-storage.md)
- [Ch.14 summary](../references/book-summaries/architecting-on-cloudflare-ch14-kv-hyperdrive.md)
