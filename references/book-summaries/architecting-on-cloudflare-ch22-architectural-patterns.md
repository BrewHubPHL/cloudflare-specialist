# Chapter 22: Architectural Patterns and Reference Designs

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-22) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/architectural-patterns.md`, `anti-patterns.md`, cross-links to gateway/multi-tenant/workflow patterns

---

## One-line thesis

**Boring beats clever** — pick patterns from a **latency budget** and problem type; record judgment in **ADRs**.

---

## Latency budget (work backwards)

| Hop | Typical cost |
|-----|--------------|
| Colocated service binding | <1ms |
| Remote service binding | 5–15ms |
| DO same region as user | 5–10ms |
| DO cross-continent | 100–200ms |
| External API | 50–300ms+ |

Example: 200ms budget, 150ms DB → 50ms left for gateway + DO session — cross-continental DO blows budget.

---

## Pattern selection matrix

| Problem | Pattern | Primitive |
|---------|---------|-----------|
| Central auth/routing/rate limits | API Gateway | Worker + service bindings |
| Client-specific API shapes | BFF | Worker per client type |
| Real-time sync | Collaboration | DO + WebSocket |
| Multi-step reliable process | Saga | Workflows |
| Async decoupling | Event-driven | Queues |

---

## Key patterns (essence)

**API Gateway** — authenticate, rate limit, route via bindings; backends **trust gateway headers** (or gateway is expensive proxy).

**Rate limiting** — DO per key (user/API key); avoid single global DO hotspot.

**Edge BFF** — parallel backend fetches near user; mobile minimal payload vs web rich aggregate.

**Edge A/B** — cookie assignment + KV experiment config; no redeploy for weight changes.

**Collaboration** — one DO per room; output gating = broadcast after durable write; CRDT/OT is your problem.

**Events** — at-least-once Queues; idempotent consumers; handle-then-record order for crash safety.

**Saga** — Workflows with compensation steps; reserve + release inventory on payment failure.

**Three layers** — interaction (gateway/BFF) / control (orchestration) / mechanism (D1/R2/APIs).

---

## Pattern anti-patterns

- **Everything gateway** — business logic in gateway → monolith bottleneck
- **Premature event-driven** — queue where sync call suffices
- **DO for everything** — KV/D1 when no coordination needed
- **Saga without compensation** — leaked reservations/charges

---

## ADRs

Capture: context, options, decision, trade-offs, reconsideration triggers.

Examples in book: DB-per-tenant vs RLS Postgres; DO vs Redis rate limits; Queues vs Workflows for file processing.

---

## Production notes

- API adapter Worker as gateway toward Hyperdrive Postgres + fleet agents
- Per-tenant rate limits via DO keyed by tenantId/userId
- Order/payment sagas → Workflows (see `workflows.md`)
- ADRs for SSOT-on-Postgres vs D1 edge slices

---

## Key quotes

> "The right pattern isn't the cleverest one; it's the one that makes your system boring."

> "Events are for consequences, not requirements."

> "Design compensations before acquisitions."
