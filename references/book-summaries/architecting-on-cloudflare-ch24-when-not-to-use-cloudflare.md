# Chapter 24: When Not to Use Cloudflare

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-24) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/platform-assessment.md`, `anti-patterns.md`, `SKILL.md` (Kill switches)

---

## One-line thesis

Cloudflare is a **specific architectural bet** (lightweight global compute, horizontal data, DO coordination) — not a general-purpose cloud. Match workload shape deliberately or choose elsewhere.

---

## Constraints are architectural, not temporary

| Constraint | Why it exists |
|------------|---------------|
| 128 MB / isolate | Density + instant cold starts |
| 10 GB / D1 database | Many small DBs (DO-backed), not one whale |
| HTTP-only ingress | Proxy network model |
| No cross-DB transactions | Horizontal partition design |

Waiting for these to "go away" misunderstands the platform. Node compat gaps may improve; isolate memory will not.

---

## Binary disqualifiers

| Need | Cloudflare answer |
|------|-------------------|
| >12 GB RAM / instance | Not on platform (even Containers cap at 12 GB) |
| Inbound UDP (non-WebRTC) | Not for your code (Spectrum ≠ direct to Worker) |
| True archival $/GB-month | R2 is hot object storage, not Glacier-class |
| Cross-database atomic TX | Sagas / external RDBMS |
| >128 MB per request, no streaming | Containers or external |
| >5 min CPU / request | Containers, Queues, external batch |

---

## Red flags (look elsewhere)

- "Migrate without rearchitecting"
- Data model assumes single large monolithic DB **and** refuses Hyperdrive
- Atomic cross-tenant transactions (regulatory) — sagas may be unacceptable
- Direct UDP protocol requirement (non-WebRTC)
- 5 years AWS expertise, 3-month deadline, neutral workload fit
- Deep SageMaker + Step Functions + S3 pipeline fabric

**Force-fit combo:** no-change migration + monolithic DB + cross-tenant atomicity → **stop**.

---

## Different vs worse

Requirements born from **current platform pain** may not apply:

- Provisioned concurrency → Lambda cold starts
- Connection pool tuning → RDS/Lambda
- Vertical DB scaling → traditional RDBMS

Litmus: *Can you explain the requirement independent of today's cloud?*

- "2 GB RAM because image lib loads full buffer" → genuine
- "Provisioned concurrency for latency" → platform-specific adaptation

---

## "Almost fits" (90% on platform)

Options when one component exceeds limits:

| Option | Favour when |
|--------|-------------|
| External service carve-out | Peripheral, rare, team OK multi-platform |
| Containers | Core feature, need platform unity, accept cold start |
| Redesign | Client-side thumbnail, simpler PDF, streaming |

Avoid elaborate streaming gymnastics for conceptually simple memory-heavy ops.

---

## Lock-in spectrum (exit planning)

| Tier | Assets | Exit cost |
|------|--------|-----------|
| Low | Stateless JS, R2 | Config + binding swap |
| Medium | D1 per-tenant, Queues, Workflows | Pattern translation |
| High | Durable Objects core | Rebuild coordination (Orleans/Temporal/Redis) |

Plan exit when adopting — especially DO — even if no intent to leave. Isolate platform calls behind thin adapters if optionality matters.

---

## When hyperscalers win

- Deep cloud-native service mesh (SageMaker pipelines, BigQuery-centric analytics)
- Regulatory mandates Cloudflare certs don't satisfy (verify per contract)
- GPU training / custom CUDA (Workers AI = hosted inference only)
- Lift-and-shift VMs with minimal change

Cloudflare can still **front** hyperscaler origins (WAF, CDN, edge auth) without compute migration.

---

## Hybrid default boundary

**Edge:** auth, caching, rate limits, routing, personalisation  
**Backend:** business logic near data, batch, GPU, legacy

BrewHub pattern: Workers + Access/Tunnel at edge; Postgres + Python agents on Coolify/Hetzner; Hyperdrive bridges Worker → SSOT.

Hybrid steady state is valid — not a phase you must exit.

---

## Native design litmus test

| Signal | Interpretation |
|--------|----------------|
| "DO per user because state is naturally isolated" | Native — accelerates |
| "DO but we need distributed locks across them" | Adaptation — friction |

Wrong question: *"How do I force my workload onto Cloudflare?"*  
Right question: *"Does my domain map to these primitives?"*

---

## Decision sequence

1. **Threshold:** hard limits — fail any → Containers/external/hybrid or stop
2. **Fit:** edge latency value, horizontal data model, eventual consistency OK?
3. **Native design:** primitives align with domain language?

---

## Promoted kill switches (skill-level)

Escalate when proposals:

- Require cross-partition atomicity on D1 alone for money
- Need inbound UDP/TCP to Worker code
- Assume lift-and-shift without outcome reframing
- Buffer multi-MB payloads in Worker memory routinely
- Deploy globally without rollback/canary path

---

## What transfers on exit

- JS/TS business logic (minus bindings)
- R2 → S3 tools; D1 → SQLite/SQL dumps
- Architectural lessons (edge-first, horizontal partition thinking)

Requires reconstruction: **Durable Objects coordination layer**
