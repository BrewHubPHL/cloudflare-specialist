# Chapter 20: Observability and Operations

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-20) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/observability-operations.md`, `workers-fundamentals.md`, kill switches in `SKILL.md`

---

## One-line thesis

Edge observability is **architecture, not afterthought** — no SSH, no debugger, no heap dump; logs + correlation IDs + rollback are the toolkit.

---

## Three layers

| Layer | Tool | Role |
|-------|------|------|
| Real-time | `wrangler tail` | Dev/incident now; ephemeral |
| Persistent default | **Workers Logs** (7d paid) | Query builder, automatic |
| Archive / compliance | Logpush → R2 / platform | >7d retention; cost varies 200× R2 vs Datadog |

Logpush → Pipelines → Iceberg → **R2 SQL** for cheap queryable archives.

---

## Cannot do in production

- Attach debugger
- Heap dump / flame graphs
- Inspect post-request memory

→ **Reproduce locally** with debuggable JSON logs (input + stack).

---

## Workers Logs config

```toml
[observability]
enabled = true

[observability.logs]
invocation_logs = true
head_sampling_rate = 1  # 0.1 for high traffic

[observability.traces]
enabled = true
head_sampling_rate = 0.01
```

Automatic traces: D1/KV/R2 bindings in one Worker. **Not** across service bindings/DO — propagate headers manually.

---

## Correlation

Generate `requestId` once; pass via headers to DO/service bindings. Use `cf-ray` or UUID.

Never log secrets.

---

## Analytics Engine

High-cardinality business metrics (per-tenant usage billing). Not real-time alerting.

---

## Alerting at edge

- Global: error rate > X%
- **Regional:** error rate > Y% in any colo (global 2% can hide Singapore 50%)
- Calibrate thresholds from baseline week

---

## Incident response

1. **`wrangler rollback`** first if post-deploy
2. KV feature flags for mitigation without deploy
3. Post-incident: actionable items, not blame

---

## DO observability

- Can't query DO SQLite externally — log state transitions
- WS: log open/close; hibernation = passive
- Alarms: log trigger + drift + failures (at-least-once)

---

## Named failure signatures (from book)

| Pattern | Log/alert signal |
|---------|------------------|
| Timing assumption | High wall, low CPU — sequential remote DB |
| DO placement mismatch | Bimodal DO latency by user colo |
| Poison queue message | Same message ID, attempts > 3 |
| KV stale read | Read older than recent write same session |

---

## Production notes

- Workers Logs on API adapter + OpenNext edge
- Webhook audit in R2 via Logpush path for long retention
- Healthz monitor logs Access 302 as DOWN
- Rollback + Access kill switches as infrastructure

---

## Promoted anti-patterns

- Rely on `wrangler tail` alone for production
- Global-only error alerts
- Minimal error logs without input context
- No request ID across DO/service binding chain
- Debug production Workers expecting attach debugger
