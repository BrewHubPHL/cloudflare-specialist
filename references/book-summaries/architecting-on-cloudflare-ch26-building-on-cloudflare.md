# Chapter 26: Building on Cloudflare (Capstone)

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-26) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/platform-assessment.md`, `SKILL.md` Core Principles, kill switches

---

## One-line thesis

Three mental models — **horizontal, global, primitives** — plus honest fit assessment before you commit.

---

## Mental models

### Think horizontal, not vertical

Start sharded: DO per entity, D1 per tenant, KV per key — not scale-up then shard.

Wrong: "How do I make this bigger?"  
Right: "How do I partition naturally?"

### Think global, not regional

Workers deploy everywhere by default — no multi-region config. Data has locality (DO placement, D1 primary, KV eventual global).

Eliminates hyperscaler failover complexity; also eliminates some enterprise regional controls.

### Think primitives, not services

Workers + D1 + DO compose freely — more upfront work, less fighting managed service opinions at scale.

---

## Truths worth remembering

- Constraints are **architectural** (128 MB, 10 GB/D1, HTTP ingress) — not temporary
- **Durable Objects** have no hyperscaler equivalent — power + lock-in
- **CPU time ≠ wall time** — orchestrate at edge, compute elsewhere
- **Boring architecture** wins at 3am
- **Edge AI** = right continent, not instant inference
- **Design for platform or choose another** — workarounds compound

---

## Decision framework (order)

1. **Hard limits** — memory, TCP/UDP, cross-partition strong TX, single massive DB?
2. **Architectural alignment** — edge benefit, horizontal data model, eventual consistency OK?
3. **Team fit** — JS/TS, primitives comfort?

---

## Cloudflare excels at

- Global request-response (APIs, webhooks, SSR)
- Coordination (DO — chat, rate limits, games; Realtime for A/V)
- I/O-heavy orchestration (CPU billing)
- Latency-sensitive global apps
- AI-as-feature (Workers AI, Vectorize, AI Search)

---

## Cloudflare weak at

- Memory-heavy >128 MB (Containers/external)
- Long single-invocation compute (Workflows/Containers/external)
- Non-HTTP protocols (except WebRTC via Realtime)
- Vertical DB assumptions
- Frontier AI as primary differentiator (AI Gateway to external)

---

## Path forward

| Situation | Action |
|-----------|--------|
| Evaluating | Prototype one week — hit limits, measure latency/cost |
| Migrating | Incremental strangler; measure before/after; rollback ready |
| Greenfield | Start Cloudflare defaults; discover constraints early |
| Doesn't fit | Valid conclusion — choose better tool |

---

## Synthesis

Hybrid is the architecture, not compromise:

```
Edge Workers → auth, UI, cache, routing
Hyperdrive → Postgres SSOT (fleet)
Tunnel → Python agents (Coolify)
```

Horizontal: tenant-scoped data, DO per session/room, not god objects.

Global: canary deploy mandatory — one bug → all PoPs.

---

## Key quotes

> "For workloads that fit, trade-offs unlock capabilities expensive elsewhere."

> "Choosing the right tool matters more than platform loyalty."

> "You have the architectural foundations — now build."
