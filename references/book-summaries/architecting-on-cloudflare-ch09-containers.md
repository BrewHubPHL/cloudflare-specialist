# Chapter 9: Containers — Beyond V8 Isolates

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-09) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/containers.md`, `patterns/cost-modelling.md`, `anti-patterns.md`

---

## One-line thesis

**Workers charge for thinking; Containers charge for existing** — I/O-heavy workloads on Containers can cost 100–500× more than Workers; reach for Containers only when V8 limits are genuinely unavoidable.

---

## Architecture

Every Container instance = **Durable Object (brain) + Container (muscle)**.

```
Request → Worker/DO → Container (HTTP)
         ↑
    DO ID = routing/sharding strategy
```

Same global routing as Ch.6 — `idFromName(userId)` → per-user container. DO SQLite persists coordination state across container sleep/restart.

---

## Escape or restructure?

Before Containers, ask: can streaming/chunking/R2 intermediate state fit Workers?

| Restructure to Workers when | Accept Containers when |
|------------------------------|------------------------|
| Refactor < ~1 week engineering | Need Go/Java/.NET/non-WASM runtime |
| Runs >10k×/month (savings compound) | Rare workload; rewrite not worth it |
| Sub-second latency required | Existing containerised app works |
| One compute model preferred | Must hold >128 MB in memory simultaneously |

---

## Hard boundaries

**Containers required:**

- >128 MB memory in-process (and streaming won't work)
- Non-JS/TS/Python/WASM runtimes
- >5 min **CPU** time (not wall — Workers wait on I/O free)
- Persistent filesystem / temp files (up to ~20 GB disk)

**Containers can't help:**

- >4 vCPU / >12 GB RAM → hyperscaler
- Inbound TCP/UDP from internet (game servers, MQTT) → traditional cloud + LB
- Docker-in-Docker (CI spawning containers)

---

## Routing strategies

| Strategy | DO ID from | Trade-off |
|----------|------------|-----------|
| Per-user | userId | Strong isolation; many cold starts |
| Shared pool | poolId | Warm, cheap; noisy neighbour |
| Session-sticky | sessionId | Mid cost; session duration sensitivity |

Hybrid: fast path Worker; heavy path per-user Container async.

---

## Cold starts

**3–15 seconds** typical — unacceptable for interactive UX.

Mitigations (architectural, not micro-optimisation):

- Worker responds immediately; Container processes async (webhook/poll/WS)
- Pre-warm on predictable events
- Longer `sleepAfter` when cold start > idle cost
- Batch/async workflows tolerate cold start

---

## Cost example (book)

100k req/day: 3ms CPU + 200ms wait each.

- **Workers:** ~$0.20/mo (pay CPU only)
- **Containers:** ~$100/mo (pay wall time) — ~500×

Containers competitive when **CPU-saturated** (video transcode: seconds of compute per request) vs hyperscaler EC2, not vs Workers.

---

## Observability

| Symptom | Likely layer |
|---------|--------------|
| Container errors only | App bug in container |
| DO + Container errors | OOM, failed start, infra |
| Latency ↑ with traffic | CPU-bound, queueing |
| Random latency spikes | Cold starts |

Trace IDs across Worker → DO → Container. `wrangler containers ssh` for live debug (not routine ops).

---

## vs hyperscalers

Choose **Cloudflare** when: global distribution default, already on Workers/DO, coordination model fits.

Choose **hyperscaler** when: native VPC, >12 GB RAM, deep SQS/DynamoDB/BigQuery coupling.

---

## BrewHub notes

- Default: Python agents on fleet via Tunnel — not Containers unless porting specific binary
- Queue consumer needing 4 GB RAM or Go binary → Container or fleet pull consumer
- Never expose Containers for interactive shop checkout — Worker edge + async fleet job
- Media transforms: try Media Transformations binding in Worker before Container

---

## Key quotes

> "The right question isn't 'can Containers do this?' but 'must Containers do this?'"

> "You cannot eliminate cold starts; you can only choose who experiences them."

> "Containers bill for wall time, not CPU time."
