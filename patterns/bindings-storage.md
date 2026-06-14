# Bindings & Storage (KV, R2, D1, Hyperdrive)

**Impact:** HIGH  
**Tags:** kv, r2, d1, hyperdrive, sqlite  
**Source:** Cloudflare docs + *Architecting on Cloudflare* Ch.11–12 — [storage selection summary](../references/book-summaries/architecting-on-cloudflare-ch11-storage-selection.md)

---

## Philosophy: many small things

Cloudflare storage is **horizontally scaled by design**. The 10 GB D1 cap is per database, not a missing feature — partition from day one (DB-per-tenant, object-per-entity).

Wrong question: "How do I store 100 GB in one D1?"  
Right question: "How do I partition across databases/objects?"

---

## Three-question framework (Ch.11)

Work in order — first clear answer usually wins:

1. **Access pattern** — read-heavy rare writes → KV; relational → D1/Hyperdrive; files → R2
2. **Consistency** — must read your write immediately → not KV; balances/counters → not KV alone
3. **Coordination** — atomic check-increment → Durable Objects, not D1 row locks

---

## Selection matrix

| Product | Consistency | Best for | Avoid for |
|---------|-------------|----------|-----------|
| **KV** | Eventual (~60s) | Config cache, feature flags, idempotency keys (short TTL) | Financial ledger, inventory SSOT |
| **R2** | Strong per object | Uploads, exports, webhook payload archives | Hot relational queries |
| **D1** | SQL, single-location DO | Per-tenant/per-user SQLite at edge | Monolithic multi-tenant DB, >10 GB partition |
| **Hyperdrive** | Pooled Postgres/MySQL | Worker → existing Supabase/Postgres (**BrewHub SSOT**) | Schema migrations (still in Postgres) |
| **DO SQLite** | Strong, per entity | Coordination + small relational state per actor | Cross-entity SQL, analytics |

**D1 mental model:** a Durable Object with SQL — single-threaded, 10 GB max **per database**, many databases by design.

BrewHub default: **Hyperdrive → fleet Postgres** for money and customer data. D1 only for edge-native relational slices without SSOT role.

---

## Mismatch failures (diagnose by name)

| Name | Symptom | Fix |
|------|---------|-----|
| **Consistency collision** | Updated KV, user still sees old value | D1 / Postgres |
| **Coordination gap** | Rate limit exceeded under concurrency | DO per entity |
| **Query impedance** | "Find all keys where…" on KV | D1 / Hyperdrive |
| **Blob bloat** | Large binary in D1/KV | R2 + metadata row |
| **Partition avoidance** | One DB hitting 10 GB / one god DO | Shard by tenant/entity |

---

## Combining primitives

| Pattern | Authoritative | Derived |
|---------|---------------|---------|
| Config + app data | D1 or Postgres | KV for config reads |
| Files | R2 bytes | D1/Postgres metadata |
| Live collaboration | DO (live) | Periodic flush to D1/Postgres (history) |
| Read-through cache | D1/Postgres | KV (invalidate on write) |

One store owns truth; others are cache or derivatives.

---

## D1 vs Hyperdrive (decision)

| Choose D1 | Choose Hyperdrive → Postgres |
|-----------|------------------------------|
| Greenfield, natural tenant/user boundaries | Existing Postgres/Supabase works |
| Zero DB operations at edge | Need >10 GB per logical partition |
| SQLite features sufficient | PostGIS, stored procs, LISTEN/NOTIFY, heavy RLS |

---

## D1 architecture notes

- One database = one location; all writes to primary
- Slow query blocks **entire** database (~100 QPS at 10 ms/query)
- **Index hot paths** — `EXPLAIN QUERY PLAN`; table scans don't scale
- Bill on **rows read/written** — indexing affects cost directly
- No cross-database queries — aggregate in Worker or use analytics store
- **Multi-tenant:** database-per-tenant, not one 100 GB database

### Sessions (read-your-writes)

After write + immediate read in same request flow:

```typescript
const session = env.DB.withSession();
await session.prepare("UPDATE users SET name = ? WHERE id = ?")
  .bind(name, userId).run();
const user = await session.prepare("SELECT * FROM users WHERE id = ?")
  .bind(userId).first();
```

Use sessions for authenticated user flows; replica reads OK for dashboards where seconds of staleness acceptable.

### Batch (atomic)

```typescript
await env.DB.batch([
  env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId),
  env.DB.prepare("SELECT * FROM orders WHERE user_id = ?").bind(userId),
]);
```

Write conflicts: optimistic concurrency — retry; hot row contention → consider DO.

### Provisioning geography

Creating all tenant DBs from CI in one region places every DB there. Create from edge near user signup or use per-user DB on first request.

### Time Travel

PITR to any minute (30 days paid) — `wrangler d1 time-travel restore`. Long archive: export to R2.

---

## KV binding

Deep patterns: **[kv-hyperdrive.md](kv-hyperdrive.md)** — consistency traps, TTL, Hyperdrive pooling, BrewHub SSOT.

```jsonc
{
  "kv_namespaces": [{ "binding": "CACHE", "id": "<namespace-id>" }]
}
```

```typescript
await env.CACHE.put(`menu:v3`, JSON.stringify(menu), { expirationTtl: 300 });
const cached = await env.CACHE.get(`menu:v3`, 'json');
```

---

## R2

See **[r2-object-storage.md](r2-object-storage.md)** — zero egress, presigned uploads, event notifications, CDN/transform patterns.

Quick binding:

```jsonc
{ "r2_buckets": [{ "binding": "AUDIT", "bucket_name": "webhook-audit" }] }
```

---

## Hyperdrive to Postgres (BrewHub SSOT)

Deep dive: **[kv-hyperdrive.md](kv-hyperdrive.md)** — query caching, pool exhaustion, multi-region replicas.

Workers → existing Postgres/Supabase without migrating data. **Valid permanent architecture** — not merely a migration stepping stone (Ch.25).

```jsonc
{
  "hyperdrive": [{
    "binding": "HYPERDRIVE",
    "id": "<hyperdrive-config-id>"
  }]
}
```

```typescript
const sql = postgres(env.HYPERDRIVE.connectionString);
const rows = await sql`SELECT * FROM orders WHERE tenant_id = ${tenantId} LIMIT 50`;
```

**Configure with transaction pooler URI** (Supabase pooler port) — see `supabase-specialist`.

| Use Hyperdrive | Migrate to D1 instead |
|--------------|----------------------|
| Existing Postgres schema/investment | Greenfield edge-native slice |
| >10 GB per logical partition | Natural DB-per-tenant under 10 GB |
| PostGIS, procs, LISTEN/NOTIFY, heavy RLS | SQLite features sufficient |
| Multi-app shared database | Single Worker-owned data |

**Migration path:** Hyperdrive bridge first → prove compute → dual-write only if D1 justified — `migration-playbooks.md`.

Pair with **Smart Placement** when backend latency dominates. Enable **read replicas** in Hyperdrive config when stale reads OK.

Local dev: `remote: true` on Hyperdrive binding for staging DB only — `local-dev-testing.md`.

---

## Remote bindings in dev

```jsonc
{
  "r2_buckets": [{
    "binding": "AUDIT",
    "bucket_name": "webhook-audit",
    "remote": true
  }]
}
```

Local Worker code hits production binding — use carefully.

---

## References

- [KV bindings](https://developers.cloudflare.com/kv/concepts/kv-bindings/)
- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [D1](https://developers.cloudflare.com/d1/)
- [Ch.12 book summary](../references/book-summaries/architecting-on-cloudflare-ch12-d1-sqlite-at-edge.md)
- [Ch.14 KV & Hyperdrive](../references/book-summaries/architecting-on-cloudflare-ch14-kv-hyperdrive.md)
- [KV & Hyperdrive patterns](kv-hyperdrive.md)
- [R2 patterns](r2-object-storage.md)
