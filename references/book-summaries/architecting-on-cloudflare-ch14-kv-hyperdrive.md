# Chapter 14: KV and Hyperdrive

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-14) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/kv-hyperdrive.md`, `patterns/bindings-storage.md`

---

## One-line thesis

**KV** = CDN you can write to (eventual consistency, sub-10ms reads). **Hyperdrive** = pay the geography tax once (pooled connections at DB, edge access everywhere).

---

## KV mental model

Not a database — globally distributed cache you control. Trades consistency for geography.

```typescript
const flags = await env.CONFIG.get("feature-flags", { type: "json", cacheTtl: 300 });
await env.CONFIG.put("session:abc", JSON.stringify(session), { expirationTtl: 3600 });
```

- `cacheTtl` — edge re-check frequency (min ~30s)
- `expirationTtl` — when key is deleted
- **No monotonic reads** — London may see v2, Paris v1 on next request
- **Cannot coordinate** — counters, inventory, rate limits → Durable Objects

### Failure modes (named)

| Mode | Issue | Fix |
|------|-------|-----|
| Stale read after write | Read from edge before propagation | Return written value; use D1/DO for user-visible |
| Negative caching | `get` miss cached; new key invisible at some edges | Don't rely on existence checks |
| Read skew | Users in different cities see different values | D1/DO if user-visible harm |

### Right for KV

Feature flags, cached API responses, session tokens (read-heavy), static metadata.

### Wrong for KV

Counters, carts, frequent user-visible updates, write-heavy (>20% writes — compare D1 cost), large values (>100 KB → R2).

### Namespace strategy

1,000 namespaces/account — per concern (config, sessions, cache) or per tenant (<1000 B2B).

### Cache invalidation

**No reliable invalidation.** TTL-based expiration; cache-aside with accepted staleness. Content-addressable keys (hash in key, version pointer in DO) sidestep invalidation — like static assets.

---

## Hyperdrive mental model

Geography tax: Sydney Worker → us-east-1 Postgres = 400–600ms connection ceremony before 5ms query.

Hyperdrive pools near DB; Worker connects to nearest Hyperdrive node → **~50–80ms** typical from distant users.

```typescript
const sql = postgres(env.HYPERDRIVE.connectionString);
const users = await sql`SELECT * FROM users WHERE active = true`;
```

- Existing driver code unchanged
- Transactions: connection dedicated until commit/rollback — keep short
- Pool sizing configurable (floor 5)
- **Query caching optional** — disable for write-then-read; stale cache trap
- TLS required
- Multi-region replicas: multiple Hyperdrive configs, route reads per region

### Failure modes

Origin unreachable, pool exhaustion (rising p99 before errors), stale cache after write, credential rotation race, origin timeout cascade.

### vs RDS Proxy

RDS Proxy = same-region connection storms. Hyperdrive = global Workers + geography + optional query cache.

**Permanent architecture** — not just migration bridge (Postgres SSOT).

---

## KV vs D1 vs Hyperdrive (first question: how stale?)

| Situation | Choose |
|-----------|--------|
| Staleness OK, key lookup | KV |
| Relational, greenfield | D1 |
| Existing Postgres/MySQL | Hyperdrive |
| Coordination | DO |

Write-heavy → not KV (10:1 write pricing).

---

## Production notes

- Tenant config / feature flags → KV with TTL matching deploy cadence
- Money, inventory, entitlements → Hyperdrive Postgres (never KV authoritative)
- Hyperdrive pooler URI + Smart Placement for hot paths
- Monitor Hyperdrive p99 latency for pool pressure

---

## Key quotes

> "The first question isn't how fast but how stale."

> "Hyperdrive doesn't make your database faster; it eliminates the distance penalty."

> "You cannot reliably invalidate KV — design for TTL, not clever invalidation."
