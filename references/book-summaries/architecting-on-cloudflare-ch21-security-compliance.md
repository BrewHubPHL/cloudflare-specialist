# Chapter 21: Security, Compliance, and Deployment

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-21) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/security-compliance.md`, `patterns/zero-trust-tunnels.md`, `patterns/wrangler-config.md`, kill switches in `SKILL.md`

---

## One-line thesis

Isolates shrink the **multi-tenant** attack surface — they don't replace secure coding, least-privilege bindings, compliance-by-design data models, or gradual deploy with instant rollback.

---

## Isolate security model

**Protects:** cross-customer memory isolation (V8 sandbox, pointer cage, memory protection keys, cordons, layer-2 seccomp sandbox).

**Does not protect:** your buggy code, misconfigured bindings, secrets in logs, sensitive data persisted to KV/D1/DO without TTL, supply chain in npm deps.

Defence through **absence**: no hi-res timers (Spectre), no threads (side channels), no filesystem, no raw network (proxy mediates outbound).

---

## Authentication strategy

| Scenario | Approach |
|----------|----------|
| Internal tools / employees | **Cloudflare Access** (Okta/Azure AD/Google) |
| Consumer app, own users | Custom **JWT** at edge |
| B2B SSO | Access or SAML |
| Public developer API | API keys + rate limits |
| Service-to-service | Service tokens / mTLS |
| Mixed | Access employees + JWT external |

Edge auth rejects invalid requests before Hyperdrive/Postgres — economic + security win at scale.

---

## Session storage

| Session type | Store |
|--------------|-------|
| Token + metadata (eventual OK) | KV |
| Queryable / invalidate-all-sessions | D1 |
| WebSocket / presence / coordination | Durable Object |

---

## Secrets

Default: **wrangler secrets** (encrypted, env injection). External vault when: rotation audit trail (PCI), dynamic DB creds, multi-cloud consistency.

Rotation: dual-key overlap period — design in from start.

Scannable token prefixes (`cfk_`, `cfat_`) + GitHub secret scanning auto-revoke — backstop, not substitute for narrow scopes.

---

## Compliance as architecture

Platform certs (SOC 2, ISO 27001, GDPR docs, HIPAA BAA, PCI) ≠ your app is compliant.

**GDPR:** consistent `user_id` everywhere; designed deletion/export across D1+R2+KV+DO — not archaeology.

**Data residency / DLS (Enterprise):** Regional Services, Geo Key Manager, Customer Metadata Boundary — each adds latency trade-offs; verify product compatibility (HTTP/3, Smart Placement gaps).

**HIPAA:** BAA is table stakes; you implement access control, audit, minimum necessary.

**PCI:** scope reduction — Stripe/Adyen tokens, never raw PAN in Workers.

---

## Deployment as hypothesis testing

Cloudflare rollback = **route traffic** to previous version (milliseconds), not redeploy infrastructure.

Before deploy, define:

- Error rate delta threshold
- P99 latency ceiling
- Business metrics (conversion, API success)
- No new error signatures

Gradual rollout: 1% high-risk → 10% moderate → 50% low-risk. Bake time: ~1hr or 10k requests per stage.

**Kill switch:** rollback immediately when triggers fire — both versions already running.

Environments: same code, **different bindings** — not `if (env === 'staging')` logic. Feature flags > environment conditionals.

**Workers Builds:** Git connect, preview URLs per branch, monorepo root/watch paths. External CI when self-hosted Git, complex orchestration, atomic multi-service migrations.

---

## Private connectivity

- **Tunnel:** outbound-only `cloudflared` — BrewHub fleet default
- **VPC Services (beta):** binding-scoped endpoint — SSRF-safe vs broad tunnel access
- **Mesh / `cf1:network`:** agent access to internal hosts without per-host registration

Hybrid edge: Workers unify auth/logging/rate limits across AWS + GCP + on-prem backends.

---

## Edge security practices

- **Rate limits:** KV ≈ approximate; DO = exact (cost per check)
- **Input validation:** Zod at edge before Hyperdrive
- **Dependency minimisation:** smaller supply chain surface

WAF + Access + Worker validation = layered; same-zone service bindings bypass WAF — enforce in Worker.

---

## BrewHub notes

- Access for humans; service tokens for Worker → fleet (see `zero-trust-tunnels.md`)
- Payment tokens only — Postgres SSOT; audit via Logpush → R2
- Canary deploy on OpenNext + API Workers; KV flags for kill switches
- GDPR: user_id in Postgres + R2 key prefix + structured deletion job
- Agent API tokens: resource-scoped roles, Connected Applications review

---

## Key quotes

> "Platform certification is not application compliance."

> "Rollback on Cloudflare means route traffic differently — milliseconds, not minutes."

> "Defence through absence — attack surfaces deliberately excluded."
