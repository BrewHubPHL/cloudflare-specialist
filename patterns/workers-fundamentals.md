# Workers Fundamentals

**Impact:** CRITICAL  
**Tags:** workers, fetch, modules, env, cpu-time, placement  
**Source:** Cloudflare docs + *Architecting on Cloudflare* Ch.1, Ch.3 — [Ch.1 summary](../references/book-summaries/architecting-on-cloudflare-ch01-developer-platform.md), [Ch.3 summary](../references/book-summaries/architecting-on-cloudflare-ch03-workers-core-compute.md)

## Module Worker shape (required format)

```typescript
export interface Env {
  MY_KV: KVNamespace;
  MY_BUCKET: R2Bucket;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response('ok');
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
```

## Execution model (mental model)

- **V8 isolate** — not a container or VM; sub-ms cold starts; no warm-up pings or provisioned concurrency
- **128 MB hard limit** per isolate — shared across concurrent requests on the same warm isolate; not configurable
- **Warm isolates may reuse globals** — never rely on global mutable state for correctness
- **Handler return** ends the lifecycle; orphaned promises may never complete
- **Global deploy** — code runs in 330+ cities; no region selector (restrict via jurisdiction when compliance requires)

Use global scope only for **immutable init** (parsed config, compiled regex). Sessions, counters, circuit breakers → DO/KV/Postgres.

## Binding model (Ch.1)

Resources attach via **bindings** in wrangler — not connection strings in code.

```typescript
const row = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
const obj = await env.ROOM.get(idFromName(roomId));
```

| Property | Implication |
|----------|-------------|
| Config, not code | Same handler; staging/production differ only in wrangler |
| Internal path | D1/KV/R2/DO calls avoid public internet latency |
| SSRF surface | Sensitive services via `env.SERVICE` bindings — not URLs passed to `fetch()` |
| Service bindings | Worker→Worker sub-ms; prefer over HTTP between Workers |

Hyperdrive presents as a **connection string** on `env.HYPERDRIVE` — external Postgres/MySQL with pooled edge access.

## CPU time vs wall time

Workers bill **CPU milliseconds**, not elapsed time. Waiting on `fetch`, D1, KV, R2 does not consume CPU budget.

| Workload | Billing bias |
|----------|--------------|
| I/O orchestration (APIs, webhooks) | Strong Workers advantage |
| Sustained computation | Lambda/memory-heavy may win |

Design for free I/O: stream large bodies, filter in SQL, cache in KV, delegate transforms to R2/Workers AI bindings.

## Request handling

- Return `Response` early on auth failures — don't run expensive logic first.
- Use `ctx.waitUntil()` for fire-and-forget (analytics, audit) — **not** payment commit or inventory.
- Stream responses when bodies are large; avoid buffering entire payloads in memory (128 MB isolate limit is **not** configurable).

```typescript
// Money path — await, never waitUntil
const result = await env.DB.prepare('...').run();
return Response.json(result);

// Fire-and-forget — OK after response sent
ctx.waitUntil(logAudit(env, request));
```

## Resource limits (verify live docs)

| Limit | Typical paid | Configurable |
|-------|--------------|--------------|
| Memory | 128 MB / isolate | No |
| CPU time | 30s default; up to 5 min | Partially |
| Subrequests | 10,000 default; up to 10M | Yes — `limits.subrequests` |

```jsonc
{
  "limits": {
    "subrequests": 50000,
    "cpu_ms": 1000
  }
}
```

Exceeding configured subrequests fails abruptly — set ceiling deliberately; monitor fan-out.

## Subrequest security (same-zone)

Same-zone `fetch()` **bypasses** zone WAF. Cross-zone subrequests hit full security stack. Implement auth checks in Worker for internal same-zone calls, or route cross-zone if WAF must apply.

## Worker placement

When Workers call a centralised backend (Hyperdrive/Postgres, single-region API):

```jsonc
{ "placement": { "mode": "smart" } }
```

```jsonc
{ "placement": { "region": "aws:us-east-1" } }
```

Default global placement suits cache-heavy, backend-free paths. Recommendation: evaluate Smart Placement toward pooler region.

## Service bindings

Prefer service bindings over HTTP for Worker→Worker calls (sub-ms colocated vs 20–300 ms cross-network).

- **Fetch forwarding** — full Request proxy
- **RPC** — typed narrow interfaces

Start monolith; split on deploy independence, shared auth, or measured need — not microservice fashion.

## Error handling at the edge

- **No in-isolate circuit breakers** — state in DO/KV
- **Set fetch timeouts** — `AbortController`; default is no timeout
- **Geo-localised failures** — aggregate error rate hides regional backend outages
- **Retries** — cheap in CPU terms; still require idempotency + backoff

Named failure modes: orphaned `waitUntil`, subrequest exhaustion, timeout cascade, cold cache stampede.

## Compatibility

```jsonc
{
  "compatibility_date": "2026-06-14",
  "compatibility_flags": ["nodejs_compat"]
}
```

Set `compatibility_date` to a recent date. Prefer Web APIs for new code; `nodejs_compat` for migration/npm — no filesystem, no native addons.

## Environments

```jsonc
{
  "name": "my-api",
  "env": {
    "staging": { "vars": { "ENV": "staging" } },
    "production": { "vars": { "ENV": "production" } }
  }
}
```

Deploy: `wrangler deploy --env production`

## Local development

| Command | Behavior |
|---------|----------|
| `wrangler dev` | Local workerd; bindings simulated locally by default |
| `wrangler dev --remote` | Execute on Cloudflare network |
| Remote binding (`"remote": true`) | Local code, remote KV/R2/etc. |

Populate local bindings with [local data](https://developers.cloudflare.com/workers/development-testing/local-data/) for integration tests.

## Observability

Enable observability in wrangler — see [observability-operations.md](observability-operations.md) for Workers Logs, sampling, requestId propagation, and rollback.

Profile P95 CPU time — outliers often regex/parse loops.

## References

- [Workers llms.txt](https://developers.cloudflare.com/workers/llms.txt)
- [Migrate to module workers](https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/)
- [Ch.1 book summary](../references/book-summaries/architecting-on-cloudflare-ch01-developer-platform.md)
- [Ch.3 book summary](../references/book-summaries/architecting-on-cloudflare-ch03-workers-core-compute.md)
- [Architectural patterns](architectural-patterns.md)
