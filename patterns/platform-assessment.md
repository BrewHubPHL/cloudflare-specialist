# Platform Assessment & Fit

**Impact:** CRITICAL  
**Tags:** strategy, migration, hybrid, limitations  
**Sources:** *Architecting on Cloudflare* Ch.2, Ch.24 — [summaries](../references/book-summaries/); *Kerkour* Ch.1, Ch.10 — [intro](../references/book-summaries/cloudflare-book-ch01-introduction.md), [conclusion](../references/book-summaries/cloudflare-book-ch10-conclusion.md)

Use before greenfield commits or large migrations. Complements retrieval from live [Cloudflare docs](https://developers.cloudflare.com/workers/llms.txt) for exact limits.

Capstone mental models: [Ch.26 summary](../references/book-summaries/architecting-on-cloudflare-ch26-building-on-cloudflare.md). Platform foundation: [Ch.1 summary](../references/book-summaries/architecting-on-cloudflare-ch01-developer-platform.md).

---

## Three mental models (Ch.26)

| Model | Implication |
|-------|-------------|
| **Horizontal, not vertical** | Partition from day one — DO per entity, D1 per tenant, KV per key. Ask "how do I partition?" not "how do I scale up?" |
| **Global, not regional** | Workers deploy everywhere; no multi-region failover planning. Data has locality (D1 primary, KV eventual global). Canary deploy mandatory |
| **Primitives, not services** | Compose Workers + bindings; more config upfront, less fighting managed opinions |

**Boring architecture** beats clever at 3am. **CPU time ≠ wall time** — orchestrate at edge. **DO has no hyperscaler equivalent** — power with lock-in.

---

## Default heuristic

**Start with Cloudflare; find reasons not to use it.**

Prototype on Workers when constraints are unclear — low infra commitment, fast constraint discovery. Defaulting to a hyperscaler because it is familiar accumulates switching cost before fit is validated.

BrewHub default: edge Workers + Zero Trust + self-hosted Postgres (Coolify/Hetzner). Hyperscaler or fleet-only paths require explicit justification.

---

## Kerkour reference architecture (Ch.10)

Author production pattern — **BrewHub analog:**

```
Cloudflare (CDN, WAF, Workers, R2, edge)
        │
        ▼ tunnel / orange cloud
Scaleway / Hetzner / Coolify (API, Postgres, agents)
        └── free or cheap egress on compute side
```

- **Split billing:** compute provider for API/DB; Cloudflare for network/edge — model separately.
- **Egress economics:** hyperscaler egress is denial-of-wallet; CF caching + fleet free egress = margin protection.
- **Enshitification watch:** public-company lock-in pressure, opaque pricing — document exit triggers (Hono, HTTP APIs, off-CF backups).

Multi-account: **dev / staging / prod** on separate Cloudflare accounts — one API mistake must not delete production.

---

## Three-path decision

| Path | Signals |
|------|---------|
| **Cloudflare-native** | Global users, I/O orchestration, edge auth, DO coordination, R2 egress savings, ops simplicity |
| **Hyperscaler** | SageMaker/BigQuery/etc., compute-bound, regulatory cloud mandate, RI commitments, team deadline on existing stack |
| **Hybrid** | Incremental migration, mixed profiles, edge auth/cache + central SSOT — **often optimal** |

---

## Binary filters (fail fast)

| Constraint | Threshold | Escape hatch |
|------------|-----------|--------------|
| Memory | 128 MB / isolate | Stream, Containers (≤12 GB), external |
| CPU | 5 min paid (CPU time) | Queues fan-out, Containers, external |
| D1 size | 10 GB / database | Partition (e.g. per-tenant) or Hyperdrive → Postgres |
| Ingress | HTTP, WebSocket, WebRTC (Realtime) | Not raw TCP/UDP to your code |
| Cross-partition TX | None | Workflows sagas or Postgres SSOT |

If **>12 GB RAM/instance**, **inbound UDP (non-WebRTC)**, or **mandatory cross-tenant atomicity** → Cloudflare is not the primary platform.

---

## Fit evaluation order (Ch.26)

1. **Hard limits** — fail fast using binary filters above
2. **Architectural alignment** — edge benefit, horizontal data model, eventual consistency acceptable?
3. **Team fit** — JS/TS, comfort with primitives vs managed services

If hard limits pass but alignment is poor, friction compounds — see Ch.24 kill switches.

---

## Workload checklist

Score each significant workload:

1. Typical memory <50 MB? (stream if not)
2. CPU <1s per request typical?
3. Users global vs single region?
4. Backends co-located with Worker (Smart Placement / Hyperdrive)?
5. Protocol HTTP/WS only?
6. Real-time coordination → DO justifies alone?

Multiple poor scores → fighting the platform.

---

## Native design vs adaptation

**Native:** "One DO per shop session — state naturally isolated."  
**Adaptation:** "DOs plus distributed locks because state isn't partitioned."

Listen to architecture descriptions. Adaptation predicts months of friction.

---

## Global blast radius

One deploy → all PoPs. Require:

- Canary or gradual rollout
- Real-time error/latency alerts
- Practised rollback (`wrangler rollback` / versioned deploys)

Regional isolation on hyperscalers **does not** apply.

---

## Hybrid boundary (BrewHub)

```
Edge (Workers)     → auth, rate limits, cache, routing, OpenNext UI, API adapter
SSOT (Postgres)    → money, inventory, RLS — via Hyperdrive pooler
Fleet (Tunnel)     → Python agents, Coolify services — outbound-only cloudflared
```

Edge personalisation without backend rewrite is a valid first migration step. Full cutover optional.

---

## Lock-in calibration

| Depth | Examples | Accept when |
|-------|----------|-------------|
| Low | Stateless handlers, R2, Hono routes | Commodity — prefer S3-compatible + portable HTTP |
| Medium | D1, Queues, Workflows | Domain fit beats exit ease |
| High | Durable Objects, Workers for Platforms | Capability unavailable elsewhere justifies commitment |

**Kerkour:** when CF product isn't competitive (e.g. Stream vs Bunny), use alternative — don't force vertical integration.

---

## Account & platform risk (Kerkour Ch.1)

- Separate **Cloudflare accounts per environment**
- Business payment method on account — reduces false abuse bans
- Fast CF product churn → pin `compatibility_date`, read deprecations
- Support gaps below Enterprise — runbooks in skill compensate

---

## Economics snapshot

Workers bill **CPU ms**, not wall ms — I/O-heavy APIs often 70–80% cheaper than Lambda+API Gateway+egress (author model; verify yours).

Cloudflare loses cost advantage on: compute-heavy requests, very low traffic (<$5/mo floor), active hyperscaler reservations.

Gather: requests/mo, measured CPU ms, egress GB, eliminated warm-pool spend.

---

## Migration anti-patterns

- Feature parity gate before any cutover
- Count Lambdas, ignore data model translation time
- Parallel run without comparison metrics
- "While migrating, also rebuild X"
- Big-bang cutover
- Data migration before Hyperdrive + compute path proven

Reframe success: outcomes ("sub-50ms auth globally") not parity.

Playbooks: `migration-playbooks.md` — strangler fig, gradual deploy, S3→R2, dual-write, Redis decomposition.

---

## When to escalate (kill switch)

Stop and redesign when proposals:

- Lift-and-shift monolith expecting identical behaviour
- KV as payment/inventory SSOT
- Cross-tenant atomic transfers on D1 alone
- Inbound fleet ports instead of Tunnel
- Global deploy without rollback plan

See [anti-patterns.md](../anti-patterns.md).

---

## References

- [Ch.2 summary](../references/book-summaries/architecting-on-cloudflare-ch02-strategic-assessment.md)
- [Ch.24 summary](../references/book-summaries/architecting-on-cloudflare-ch24-when-not-to-use-cloudflare.md)
- [Ch.25 migration](../references/book-summaries/architecting-on-cloudflare-ch25-migration-playbooks.md)
- [Ch.26 capstone](../references/book-summaries/architecting-on-cloudflare-ch26-building-on-cloudflare.md)
- [Kerkour Ch.1](../references/book-summaries/cloudflare-book-ch01-introduction.md)
- [Kerkour Ch.10](../references/book-summaries/cloudflare-book-ch10-conclusion.md)
- [Domain setup checklist](domain-setup-checklist.md)
- [Ch.1 foundation](../references/book-summaries/architecting-on-cloudflare-ch01-developer-platform.md)
- [Ch.22 patterns](../references/book-summaries/architecting-on-cloudflare-ch22-architectural-patterns.md)
- [Architectural patterns](architectural-patterns.md)
- [BrewHub integration](../examples/brew-hub-integration.md)
