# Chapter 19: Cost Modelling and Optimisation

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-19) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/cost-modelling.md`, `patterns/bindings-storage.md`, `anti-patterns.md`

---

## One-line thesis

Cloudflare pricing is **architectural feedback** — CPU-not-wall-time, KV 10:1 read/write, D1 per-row, R2 zero egress, DO duration when awake; misaligned storage shows up on the invoice before the dashboard.

---

## Economics behind prices

| Mechanism | Why | Design implication |
|-----------|-----|-------------------|
| **CPU time, not wall** | I/O wait is free — shared isolates | Parallel fan-out cheap; heavy parsing/crypto expensive |
| **KV 10:1 read/write** | Writes replicate globally | Read-heavy cache/flags only — not counters/session state |
| **D1 per row** | SQLite DO underneath | Index everything; unindexed scan = $1/M rows |
| **R2 zero egress** | Network is the product | Media/API egress savings dwarf compute at scale |
| **DO duration** | Memory + routing while active | Must sleep between bursts — no heartbeat anti-pattern |

What keeps DO awake: in-flight requests, open WS (even hibernated), idle timeout window, pending alarms.

---

## Storage decision matrix

| Pattern | Use | Because |
|---------|-----|---------|
| Read-heavy, rarely updated | KV | Cheapest reads |
| Write-heavy + queries | D1 | SQL + row-priced writes |
| Per-entity coordination | DO | Single-threaded consistency |
| Large binaries | R2 | Zero egress |
| Existing Postgres SSOT | Hyperdrive | Don't migrate — accelerate |

---

## When Cloudflare wins

- Egress > ~20% of hyperscaler bill (decisive at TB scale)
- Spiky unpredictable traffic (no reserved capacity gamble)
- Request-heavy, compute-light (orchestration, BFF, API gateway)
- I/O-bound Workers (5ms CPU / 500ms wall ≈ pay 5ms)

## When hyperscalers win

- Sustained compute-heavy + predictable volume (reserved EC2)
- Deep AWS service fabric (SQS/SNS/Step Functions/IAM)
- GPU ML **training**
- Monolithic DB > ~10 GB where D1 horizontal model doesn't fit

---

## TCO hidden costs (AWS side)

NAT Gateway, cross-AZ transfer, CloudWatch ingestion, provisioned concurrency — often exceed Lambda itself.

Worked SaaS example (book): ~55% savings at 50M req/mo with 5 TB egress — driven by egress + NAT + CPU billing, not Workers alone.

**Model your workload** — cache hit rate, egress TB, avg CPU ms change outcomes dramatically.

---

## AI inference costs

- Output tokens > input (sequential generation)
- 70B ≈ 10× 7B — blind eval before defaulting large
- Optimise: right-size model, `max_tokens`, AI Gateway cache, prefix caching (`x-session-affinity`), truncate context
- Agents: 5–50 LLM calls per user turn — multiply conservatively

---

## Cost warning thresholds

| Signal | Threshold | Indicates |
|--------|-----------|-----------|
| D1 reads vs storage | Reads > 10× storage | Missing indexes, N+1, broad scans |
| KV writes vs KV total | Writes > 50% | Wrong primitive — use D1/DO |
| DO duration vs requests | Duration > 100× requests | Heartbeats, polling, WS keeping awake |
| Workers CPU vs requests | CPU > 30% | Compute-heavy — cache or Containers |
| AI vs compute (non-AI app) | AI > 5× | Prompt bloat, wrong model |

---

## Optimisation priority stack

1. D1 query efficiency (`EXPLAIN QUERY PLAN`)
2. Storage primitive alignment
3. DO lifecycle / sleep
4. AI model + prompt efficiency
5. Workers CPU (only matters at 100M+ req/mo scale)

**Three-month rule:** optimisation ROI should return within 3 months of engineering time.

**Defensive CPU cap:** `[limits] cpu_ms = 50` (or P99 + headroom) — denial-of-wallet protection on Workers, DO, Workflows, queue consumers.

---

## Monitoring

Billable Usage dashboard + budget alerts (floor, not ceiling). Track: cost/request, D1 rows/query avg, DO duration/request, KV write:read ratio.

Spike diagnosis: traffic proportional? → per-request metrics → D1 query changes → cache hit rate.

Per-tenant metering: **Analytics Engine** (see `observability-operations.md`).

---

## BrewHub notes

- Postgres SSOT on fleet — Hyperdrive for edge reads; don't duplicate payment state in D1
- R2 audit logs + zero egress for exports/replay archives
- KV for feature flags and cache — not order counters
- AI Gateway + smaller models for edge classification; fleet Python for heavy agent work
- Set defensive `cpu_ms` on public-facing Workers

---

## Key quotes

> "Let pricing guide architecture."

> "Slow queries are expensive; fast queries are cheap."

> "You cannot optimise what you cannot measure."
