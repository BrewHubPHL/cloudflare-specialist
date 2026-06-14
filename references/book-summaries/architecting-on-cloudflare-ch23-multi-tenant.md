# Chapter 23: Multi-Tenant and Platform Architectures

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-23) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/multi-tenant.md`, `patterns/bindings-storage.md`, `anti-patterns.md`

---

## One-line thesis

Multi-tenant isolation is a **month-one** decision — row-level is a discipline problem; database-per-tenant is architectural insurance; Workers for Platforms only when tenants supply code.

---

## Isolation ladder (compute / data / state)

| Rung | Pattern | When |
|------|---------|------|
| 1 | Shared everything + `tenant_id` filters | Most SaaS |
| 2 | Shared compute, **DB-per-tenant** (D1) | Regulated, enterprise, schema flexibility |
| 3 | **Workers for Platforms** dispatch namespaces | Tenant-contributed code |
| 4 | Dedicated accounts/resources | Contractual (rare) |

Dimensions are independent — can mix (shared Workers + separated DBs).

---

## Data isolation decision

**Row-level:** cross-tenant analytics trivial; one migration; one DB to monitor. Risk: one missing `WHERE tenant_id` = breach.

**Database-per-tenant:** queries cannot cross tenants; per-tenant schema OK. Cost: distributed migrations, no cross-DB SQL — aggregate in Worker or analytics DB.

**Economics:** ~1000 D1 DBs can cost ~$10/mo vs ~$30 RDS — decision is **operational readiness**, not spend.

**Tenant tiering:** free/shared DB; enterprise/dedicated DB — route by tier in dispatch Worker.

**Default:** start row-level unless regulation/enterprise demands physical separation; migrate row→DB-per-tenant is weeks–months.

---

## Tenant metadata

Shared D1 registry (tenant config, domains, flags, billing) — needed **before** routing to tenant DB. Cache aggressively in KV (minutes TTL). Plan metadata outage (replicas, longer cache TTL).

---

## Noisy neighbours

- Workers: per-isolate CPU/memory — tenant can't steal another's CPU on same request path
- D1/DO: separate databases/objects = separate DO instances
- Account-level limits still shared — app-level rate limits per tenant

---

## State isolation

```typescript
const id = env.SESSION.idFromName(`${tenantId}:${sessionId}`);
```

Separate DO bindings per tenant rarely worth it — naming suffices unless tenant code runs in dispatch namespace.

---

## Workers for Platforms

Use when tenants **must** run code — not when config (JSONPath, rules, templates) suffices.

- Dispatch Worker = auth, rate limits, validation **before** tenant Worker
- **Untrusted mode** default (separate caches); trusted only if you deploy all code
- **Outbound Worker mandatory** — block internal hosts, inject creds, audit egress
- Dynamic Workers / DO Facets / Dynamic Workflows for runtime tenant code + state + durable execution
- Per-tenant AI Search via `ai_search_namespaces` binding

Document limits, bindings, failure modes for tenants — platform operator obligation.

---

## Custom domains (Cloudflare for SaaS)

Hostname → tenant lookup (KV cache). TXT vs HTTP verification. Fallback to `tenant.yourplatform.com`. Monitor cert/DNS failures; tenant subdomain always works.

---

## Metering & quotas

Per-request D1 writes for metering can exceed Worker cost — **batch in memory**, flush periodically; sample at scale.

- Soft quotas: optimistic async increment
- Hard quotas: DO per tenant (`idFromName(tenantId)`)

---

## DB-per-tenant ops

- Idempotent migrations + per-tenant status tracker
- Lazy migration on first access for dormant tenants
- Cross-tenant analytics → separate aggregate store (ETL/Queue)
- Provisioning/offboarding as resumable state machine + reconciliation job

---

## Scale inflection

| Tenants | Requirement |
|---------|-------------|
| 10 | Manual OK |
| 100 | Automation |
| 1,000 | Dedicated migration tooling |
| 10,000 | Ops dominates; metadata may shard |

---

## BrewHub notes

- Postgres SSOT on fleet via Hyperdrive — not D1 monolith for payment data
- Row-level RLS in Postgres + edge tenant context propagation
- Per-brewery isolation at Postgres/schema level if multi-brewery SaaS expands
- Workers for Platforms only if customers upload automation scripts — unlikely v1

---

## Key quotes

> "Row-level isolation is a discipline problem disguised as a technical solution."

> "Outbound controls are not automatic."

> "Build tooling before you need it urgently."
