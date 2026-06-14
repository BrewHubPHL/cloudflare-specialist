# Multi-Tenant Architecture

**Impact:** HIGH  
**Tags:** multi-tenant, saas, isolation, workers-for-platforms  
**Book:** Ch.23 — `references/book-summaries/architecting-on-cloudflare-ch23-multi-tenant.md`

## Decide early

Month-one isolation strategy determines year-three incidents. One missing `tenant_id` filter is a breach; database-per-tenant makes that class of bug architecturally impossible.

Recommended default: **Postgres SSOT on fleet** with RLS + tenant context from edge — not a D1 monolith for payment data. See `bindings-storage.md` (Hyperdrive).

---

## Isolation ladder

| Rung | Compute | Data | When |
|------|---------|------|------|
| 1 | Shared Workers | Shared D1/tables + `tenant_id` | Default SaaS |
| 2 | Shared Workers | **D1 per tenant** | Regulated, enterprise contracts |
| 3 | **Workers for Platforms** | Either | Tenants upload code |
| 4 | Dedicated everything | Dedicated | Rare contractual |

Rung 1 + row-level is correct for most products. Move up when breach consequences or contracts demand it.

---

## Row-level vs database-per-tenant

| | Row-level | DB-per-tenant (D1) |
|---|-----------|-------------------|
| Cross-tenant analytics | Easy (one SQL) | Aggregate in Worker / analytics DB |
| Breach risk | Discipline (`WHERE tenant_id`) | Architectural |
| Schema migrations | One ALTER | Distributed job per tenant |
| Per-tenant schema | Shared only | Independent |
| Cost at scale | One DB | Many small DBs — cheap on Cloudflare vs RDS |

**Start row-level** unless you already know you need physical separation. Row → DB-per-tenant migration is weeks–months.

**Tenant tiering:** shared DB for free/starter; dedicated D1 for enterprise — explicit in pricing/contracts.

---

## Tenant metadata (always shared)

Registry before tenant data routing:

- Tenant ID, tier, feature flags, billing status
- Domain → tenant mappings
- DB binding IDs for DB-per-tenant

Store in shared D1; **cache in KV** (minutes TTL). Metadata outage blocks all auth — replicate and cache aggressively.

```typescript
async function resolveTenant(hostname: string, env: Env, ctx: ExecutionContext): Promise<TenantMeta | null> {
  const cached = await env.TENANT_CACHE.get(`host:${hostname}`, "json");
  if (cached) return cached as TenantMeta;

  const row = await env.META_DB.prepare(
    "SELECT id, tier, db_binding FROM tenants WHERE domain = ?"
  ).bind(hostname).first<TenantMeta>();

  if (row) {
    ctx.waitUntil(
      env.TENANT_CACHE.put(`host:${hostname}`, JSON.stringify(row), { expirationTtl: 300 })
    );
  }
  return row;
}
```

---

## Dispatch Worker pattern

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const tenant = await authenticateAndResolveTenant(request, env);
    if (!tenant) return new Response("Unauthorized", { status: 401 });

    const db = tenant.tier === "enterprise"
      ? getDedicatedDb(env, tenant.id)
      : env.SHARED_DB;

    return handleRequest(request, { ...env, DB: db, tenant });
  },
};
```

Every query path must receive `tenant.id` — enforce via typed context, ORM scopes, or DB views.

---

## State isolation (Durable Objects)

```typescript
const id = env.SESSION.idFromName(`${tenantId}:${sessionId}`);
const stub = env.SESSION.get(id);
```

Never `${sessionId}` alone in multi-tenant systems.

Hard quotas / rate limits: DO keyed by `tenantId` — see `security-compliance.md`.

---

## Workers for Platforms

Only when tenants **run code** — prefer configuration (field maps, rules, templates) first.

```
Request → your dispatch Worker (auth, limits, validate)
       → tenant Worker in dispatch namespace
       → outbound Worker (required: block internal, audit, inject creds)
```

- **Untrusted mode** default (isolated caches)
- Document CPU/memory limits, bindings, failure modes for tenants
- Dynamic Workers / Facets / Dynamic Workflows for runtime-generated tenant code — `agents-sdk.md`, `workflows.md`

---

## Metering without bankruptcy

Per-request counter writes to D1 can cost more than the work being metered.

- Batch counts in memory; flush periodically (`waitUntil`)
- Sample at high volume for trends; exact DO counters for hard contractual limits

---

## DB-per-tenant operations

Before 100+ tenants, build:

- Idempotent migration runner + per-tenant status in KV/D1
- Lazy migration on first tenant access
- Reconciliation job (orphan DBs, stale tenants)
- Cross-tenant reports → **separate analytics store** (Queue ETL), not cross-D1 queries

Scale thresholds: manual (~10) → automation (~100) → dedicated tooling (~1k) → ops dominates (~10k).

---

## Custom domains

Cloudflare for SaaS: hostname → tenant (KV cache). Always keep `tenant.platform.com` fallback. Monitor cert/DNS failures proactively.

---

## Anti-patterns

See [anti-patterns.md](../anti-patterns.md#multi-tenant) — missing tenant filter, KV session counters, Workers for Platforms for config-only customisation.

---

## References

- [Workers for Platforms](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/)
- [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [D1 horizontal model](bindings-storage.md)
- [Migration tiering](migration-playbooks.md)
