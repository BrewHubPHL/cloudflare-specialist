# Local Dev, Testing & Debugging

**Impact:** HIGH  
**Tags:** wrangler, miniflare, testing, staging, debugging  
**Book:** Ch.5 — `references/book-summaries/architecting-on-cloudflare-ch05-local-dev-testing.md`

Production observability: `observability-operations.md`. Deploy/canary: `security-compliance.md`.

---

## Simulation boundary

**Trust locally:** business logic, routing, binding API usage, CPU/memory/subrequest limits (Miniflare/workerd).

**Don't trust locally:**

| Assumption | Reality |
|------------|---------|
| D1 round-trip ~0ms | 10–50ms per query in production |
| 20 sequential queries OK | 200ms–1s added latency |
| Cache API = CDN cache | Local tests API only |
| DO always nearby | First-request placement + cross-network |
| External API behaviour | Cloudflare IP ranges differ from laptop |

**Strategy:** iterate logic with `wrangler dev`; validate integration with `remote: true` bindings or staging deploy.

---

## Development modes

```bash
# Default — local bindings, instant reload
wrangler dev

# One binding hits deployed resource
wrangler dev --env staging

# Force all local
wrangler dev --local

# Public URL for webhooks (press t in dev)
# trycloudflare.com or named tunnel
```

Per-binding remote (replaces deprecated `--remote`):

```jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "myapp-staging",
    "database_id": "...",
    "remote": true
  }]
}
```

Use `remote: true` sparingly — real latency, real data risk. Never on production IDs during casual dev.

---

## Environments first

Configure dev / staging / production bindings in `wrangler.toml` **before** application code.

```toml
[[d1_databases]]
binding = "DB"
database_name = "app-dev"
database_id = "dev-id"

[env.staging]
[[env.staging.d1_databases]]
binding = "DB"
database_name = "app-staging"
database_id = "staging-id"
```

Rules:

- Same binding names (`env.DB`) everywhere
- **No** `if (environment === 'production')` in handlers — use feature flags in KV
- Staging schema tracks production migrations; synthetic data at realistic volume

See `wrangler-config.md`.

---

## Vite vs Wrangler

| Tool | When |
|------|------|
| `@cloudflare/vite-plugin` | Full-stack HMR (React Router, etc.) |
| Wrangler alone | API Workers, remote bindings, deploy |
| Local Explorer (`e` in dev) | Inspect local KV/R2/D1/DO state |

Production deploy: always `wrangler deploy` (or Workers Builds).

OpenNext: use `opennextjs-cloudflare preview` — not `next dev` alone.

---

## Testing

| Layer | Catches | How |
|-------|---------|-----|
| Unit + mocks | Logic bugs | Fast; mock simple KV get/put |
| Miniflare unit | Binding misuse | `@cloudflare/vitest-pool-workers` |
| Integration | SQL, DO semantics | Staging + real bindings |
| E2E | Routing, deploy config | Preview URL / staging |

**Edge-specific:**

- Skip cold-start / region testing (not applicable)
- **DO coordination** — concurrent requests against real DO on staging
- Auth/payment paths — integration test even if "simple"

Workflows: `introspectWorkflow`, `disableSleeps()`, `mockEvent()`.

If mocks exceed app code complexity — integration test instead.

---

## Debugging production

1. Classify: crash (stack) vs binding vs external vs DO state drift
2. **Trace ID** at entry — propagate to DO/service bindings / fleet

```typescript
const traceId = request.headers.get("x-trace-id") ?? crypto.randomUUID();
// log + forward header on subrequests
```

3. `wrangler tail` for active incidents
4. Workers Logs for last 7 days (paid)
5. Logpush → R2 for unsampled archive

Console logs are **sampled** under load — don't rely for audit.

Workflow step logs batch until instance completes — use dashboard step view in-flight.

---

## Common failure signatures

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Fine local, slow prod | Sequential D1/API | Batch, parallelise, denormalise |
| Subrequest limit error | Fan-out loop | Raise limit (paid), Queue, paginate |
| CPU limit | Heavy parse/crypto | Stream, offload, `cpu_ms` cap |
| Silent 5xx / truncated | 128 MB memory | Stream bodies |
| Intermittent external | IP block/rate limit | Allowlist Cloudflare egress |
| Stale reads after write | KV eventual consistency | D1 session or DO |

---

## Deployment speed trap

One deploy → all PoPs in seconds. CI must gate deploys. Practice `wrangler rollback` before incidents.

Preview: branch URLs via Workers Builds or `wrangler deploy --env preview`.

---

## BrewHub workflow

1. `wrangler dev` for API adapter business logic
2. `remote: true` on Hyperdrive **only** when debugging staging Postgres/RLS
3. Staging Access + Tunnel mirrors production auth to fleet
4. Trace ID from edge Worker through to Python agent requests
5. OpenNext preview before production Worker deploy

---

## References

- [Wrangler dev](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
- [Vitest pool workers](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Ch.5 summary](../references/book-summaries/architecting-on-cloudflare-ch05-local-dev-testing.md)
