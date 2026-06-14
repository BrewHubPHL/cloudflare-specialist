# Chapter 1: The Cloudflare Developer Platform

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-01) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/workers-fundamentals.md`, `patterns/platform-assessment.md`, `SKILL.md` Core Principles

---

## One-line thesis

Workers run in **V8 isolates** (not containers), deploy **globally by default**, and connect to resources via **bindings** — a different mental model from hyperscaler regions and connection strings.

---

## V8 isolate model

- Created in **<5ms** vs 100ms–1s Lambda cold starts
- **128 MB hard limit** per isolate (shared across concurrent requests on same isolate) — use Containers (up to 12 GB) or stream/R2 if exceeded
- **CPU time ≠ wall time** — waiting on I/O is free; orchestration economically favoured
- **Single-threaded per request** — `Promise.all` for concurrent I/O; parallelism across requests = automatic scale
- Subrequests: 10k default paid (configurable to 10M); free tier more constrained

No provisioned concurrency or warm-up pings needed.

---

## Global by default

Deploy → **330+ cities** simultaneously. No region selector for compute.

**Smart Placement** — run Worker near backend when multiple DB/API calls dominate latency.  
**Explicit placement** — `aws:us-east-1` when backend location fixed.  
Default user-proximity when backend-free or globally distributed backends.

**Jurisdictional controls** — DO `jurisdiction: "eu"`, Regional Services for compliance (opt-in restriction).

---

## Binding model

```typescript
// env.DB, env.STORAGE, env.CACHE — configured in wrangler, not connection strings
const row = await env.DB.prepare("SELECT 1").first();
```

- **Configuration, not code** — same handler, different resources per env
- Bound calls stay on internal network (often same machine) — not like public HTTP
- **SSRF immunity** — internal services via bindings/service bindings, not attacker-controlled URLs to `fetch()`
- **Service bindings** — Worker→Worker sub-ms colocated; enables decomposition without HTTP tax

---

## Platform philosophy

- **Horizontal first** — many small D1 DBs, DO per entity, billions of KV keys
- **Primitives over managed services** — compose Workers, D1, R2, DO, Queues (unbundling)
- **Edge-native** — built for global deploy, not adapted CDN + origin

Evolution: Workers (2017) → KV → DO → D1 → R2 → Queues/Hyperdrive/AI → Workflows → Agents (2025–26).

---

## Mental model shifts (from AWS/Azure/GCP)

| Hyperscaler habit | Cloudflare |
|-------------------|------------|
| Pick a region | Deploy everywhere |
| Capacity planning | Auto scale (cost via architecture, not caps) |
| Connection pools in app | Bindings (+ Hyperdrive for external DB) |
| Cold start mitigation | Unnecessary (<5ms baseline) |

---

## When model fits / doesn't

**Fits:** request/response APIs, I/O orchestration, DO coordination, global latency-sensitive apps.

**Doesn't:** >128 MB/request, >5 min CPU single invocation, non-HTTP ingress (except WebRTC/Realtime), monolithic vertical DB assumptions without Hyperdrive.

---

## BrewHub notes

- Default heuristic aligns with book: **start Cloudflare, prove constraints**
- Hybrid Postgres SSOT via Hyperdrive is valid long-term architecture
- Smart Placement toward pooler region for API adapter Worker

---

## Key quotes

> "The absence of those steps is the point."

> "Waiting is free; only actual compute time on the processor triggers charges."

> "Think of D1 databases like rows, not like servers."
