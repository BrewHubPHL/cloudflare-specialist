# Architectural Patterns

**Impact:** HIGH  
**Tags:** gateway, bff, saga, adr, latency-budget  
**Book:** Ch.22 — [summary](../references/book-summaries/architecting-on-cloudflare-ch22-architectural-patterns.md)

Patterns encode judgment — not recipes. Primitives: [workers-fundamentals.md](workers-fundamentals.md), [durable-objects.md](durable-objects.md), [workflows.md](workflows.md), [queues-cron.md](queues-cron.md).

**Principle:** choose **boring** — predictable at 3am beats clever.

---

## Latency budget first

Work backwards from user tolerance (checkout ~2s, realtime game <100ms).

| Hop | Order of magnitude |
|-----|-------------------|
| Service binding (colocated) | <1 ms |
| Service binding (cross-location) | 5–15 ms |
| Durable Object (near user) | 5–10 ms |
| Durable Object (cross-continent) | 100–200 ms |
| Hyperdrive/Postgres query | 20–150 ms+ |
| External `fetch()` | 50–300 ms+ |

If backend calls consume the budget, avoid cross-continental DO for hot paths — cache in KV or colocate via Smart Placement.

---

## Pattern picker

| Problem | Pattern | Load also |
|---------|---------|-----------|
| Shared auth, routing, global rate limits | **API Gateway** | below |
| Different payloads per client (mobile vs web) | **BFF** | below |
| Live cursors, chat rooms, presence | **Collaboration** | `durable-objects.md` |
| Independent async jobs | **Event-driven (Queues)** | `queues-cron.md` |
| Dependent steps + compensation | **Saga (Workflows)** | `workflows.md` |
| Edge experiments / canary splits | **A/B at edge** | below |

Avoid pattern when table says so — e.g. BFF without separate client teams is extra surface area.

---

## API Gateway

Every Worker is a gateway; make it **explicit** when:

- Multiple backends share auth/rate limits
- Single observability injection point
- Backends **trust** gateway-injected identity headers

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const user = await authenticate(request, env);
    if (!user && requiresAuth(request)) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (!await checkRateLimit(user?.id ?? clientIp(request), env)) {
      return new Response("Too Many Requests", { status: 429 });
    }
    return route(request, user, env);
  },
};
```

**Threshold:** one backend → Worker is enough; five+ backends with policy divergence → dedicated gateway Worker.

Gateway outage = total outage — test and monitor accordingly.

---

## Rate limiting (edge)

Central Redis rate limiting penalises distant users (200ms+ per check).

**DO per limit key** (user ID, API key) — object created near first request; subsequent checks ~10ms locally.

Avoid **single global counter DO** — all traffic routes to one object (hotspot).

See `durable-objects.md` for increment/check pattern.

---

## Backend for Frontend (BFF)

Edge BFF near user runs **parallel** backend calls — São Paulo client: 4× sequential US-East ≈ 720ms vs 1× parallel ≈ 200ms.

Use when clients have **fundamentally different** data needs (mobile bandwidth vs web richness) and staffing allows per-client Workers.

Skip when GraphQL field selection or one API shape suffices.

---

## A/B testing at edge

Experiment config in **KV**; assignment in **cookie**; Worker routes to variant origin — sub-ms overhead vs central assignment service.

Good for: same-URL page tests, feature flags, canary traffic split.

Skip when analytics platform owns assignment end-to-end.

---

## Real-time collaboration

One **DO per session** — WebSocket hibernation, authoritative state, output gating (broadcast after durable write).

Geography: object placed at first connector — global room = someone pays latency.

Conflict resolution (CRDT/OT) is application logic, not platform.

---

## Event-driven + saga

**Queues:** independent items, at-least-once, idempotent consumers.

```typescript
async function processEvent(event: Event, env: Env) {
  const done = await env.DB.prepare(
    "SELECT 1 FROM processed_events WHERE event_id = ?"
  ).bind(event.eventId).first();
  if (done) return;

  await handleEvent(event); // handle first

  await env.DB.prepare(
    "INSERT INTO processed_events (event_id) VALUES (?)"
  ).bind(event.eventId).run(); // record second — crash-safe idempotency
}
```

**Workflows:** dependent steps, compensation on failure — order saga in `workflows.md`.

Events = **consequences**, not synchronous requirements.

---

## Three-layer model

| Layer | Examples |
|-------|----------|
| **Interaction** | Gateway, BFF, Access |
| **Control** | Workflows, orchestration Workers |
| **Mechanism** | D1, R2, Hyperdrive, external APIs |

Don't put business rules in gateway or policy in storage layer.

---

## Service composition

- **Service bindings** — Worker→Worker without HTTP/TLS tax; coupling to Cloudflare deploy graph
- **External APIs** — timeouts, circuit breakers only when fallback exists

Common combos: gateway + rate limit; BFF + KV cache; collaboration + Queue audit trail.

Add patterns only for problems you have — each pattern adds operational surface.

---

## Architecture Decision Records (ADR)

One page, five questions:

1. Context — what forced a decision?
2. Options considered
3. Decision + rationale
4. Trade-offs accepted
5. Reconsideration triggers

Book examples: DB-per-tenant vs RLS Postgres; DO vs Redis rate limits; Queues vs Workflows for file pipeline.

BrewHub: document Hyperdrive Postgres SSOT, edge vs fleet agent split, tenant isolation tier.

---

## Pattern anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| Everything gateway | Move business logic to backend Workers |
| Premature Queues | Sync call when caller needs result |
| DO for config reads | KV |
| Saga without compensation | Define release/refund steps before acquire/charge |

Full list: [anti-patterns.md](../anti-patterns.md).

---

## BrewHub

```
Access (humans) → OpenNext / API Gateway Worker
  ├── rate limit DO per user/tenant
  ├── Hyperdrive → Postgres SSOT
  └── service binding or HMAC → fleet Python agents
```

Workflows for order/payment sagas; Queues for R2 upload post-processing.

---

## References

- [Ch.22 summary](../references/book-summaries/architecting-on-cloudflare-ch22-architectural-patterns.md)
- [Multi-tenant](multi-tenant.md)
- [Migration playbooks](migration-playbooks.md)
