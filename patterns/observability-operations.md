# Observability & Operations

**Impact:** HIGH  
**Tags:** observability, logging, tracing, incidents, rollback  
**Source:** *Architecting on Cloudflare* Ch.20 — [book summary](../references/book-summaries/architecting-on-cloudflare-ch20-observability-operations.md)

No servers to SSH into. Observability is **designed in** — or evidence is gone.

---

## Capability matrix

| Can | Cannot (production) |
|-----|---------------------|
| Workers Logs (7d paid), Query Builder | Attach debugger |
| `wrangler tail` (ephemeral) | Heap dump / flame graph |
| Automatic binding traces (beta) | Inspect memory after request |
| Logpush → R2 / OTLP export | Assume regional isolation limits blast radius |

---

## Minimum viable → production

**MVP:** `[observability] enabled`, `wrangler tail`, dashboard metrics.

**Production (production bar):**

```toml
[observability]
enabled = true

[observability.logs]
invocation_logs = true
head_sampling_rate = 1        # lower for billion-req/mo

[observability.traces]
enabled = true
head_sampling_rate = 0.01
```

Plus: structured JSON logs, `requestId` propagation, regional alerts, **practised `wrangler rollback`**.

---

## Structured logging

```typescript
function log(ctx: RequestContext, level: string, message: string, data?: object) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    requestId: ctx.requestId,
    userId: ctx.userId,
    message,
    ...data,
  }));
}
```

Error logs must include **reproducible input** (method, path, body snapshot, stack) — you cannot attach a debugger later.

Propagate `x-request-id` to Durable Objects and service bindings.

---

## Three layers

| Layer | Use |
|-------|-----|
| `wrangler tail` | Active deploy/debug — not archival |
| Workers Logs | Default 7-day investigation |
| Logpush → R2 | Compliance, >7d, cheap archive (Pipelines→Iceberg→R2 SQL optional) |

Log destination cost: same 300 GB logs ≈ **$4.50 R2** vs **~$900 Datadog** — choose deliberately.

---

## Tracing

- **Automatic:** D1, KV, R2 calls within one Worker (sampled)
- **Manual:** service bindings, DO, external APIs — pass trace/request headers

```typescript
await env.USER_SERVICE.fetch(new Request(url, {
  headers: {
    'x-request-id': ctx.requestId,
    'x-trace-id': ctx.traceId ?? '',
  },
}));
```

---

## Alerting (global blast radius)

Configure **both**:

- Global error rate threshold
- **Per-colo / regional** threshold — 2% global can hide 50% in one region

Calibrate from baseline week; avoid alert fatigue.

---

## Incident response

1. **`wrangler rollback`** if incident follows deploy (seconds globally)
2. KV feature flags to disable bad paths without redeploy
3. Post-incident: detection gap + systemic fix (not "be more careful")

```bash
wrangler deployments list
wrangler rollback
```

Pair with global deploy discipline from [platform-assessment.md](platform-assessment.md).

---

## Durable Objects

- Log state **transitions**, not continuous state
- WebSocket: log open/close/duration
- Alarms: log scheduled vs actual time (drift), failures (retries)

No external query of DO SQLite — logs are your window.

---

## Named failure signatures

| Book pattern | What to log/alert |
|--------------|-------------------|
| Orphaned `waitUntil` | Success response + background error |
| DO placement mismatch | `workerColo` + DO latency bimodal |
| Poison queue message | `message.attempts > 3` |
| KV stale read | write/read timestamps same session |
| Subrequest exhaustion | fan-out count vs limit |

---

## Production notes

- API Worker + OpenNext: Workers Logs enabled
- Webhook audit payloads → R2; Logpush for long retention
- Healthz: Access 302 = DOWN; log probe results
- Money paths: log business actions with `requestId`, never secrets

---

## References

- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Logpush](https://developers.cloudflare.com/workers/observability/logs/logpush/)
- [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Ch.20 summary](../references/book-summaries/architecting-on-cloudflare-ch20-observability-operations.md)
