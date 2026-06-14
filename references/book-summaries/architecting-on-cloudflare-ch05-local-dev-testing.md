# Chapter 5: Local Development, Testing, and Debugging

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-05) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/local-dev-testing.md`, `patterns/observability-operations.md`, `patterns/wrangler-config.md`

---

## One-line thesis

Miniflare simulates **V8 + bindings** faithfully for logic — it cannot simulate **global network, cache, DO placement, or production latency**; local for logic, remote/staging for integration.

---

## Simulation boundary

**High fidelity locally:** JS execution, KV/D1/R2/DO APIs, CPU/memory/subrequest limits.

**Breaks locally:**

| Gap | Production reality |
|-----|-------------------|
| D1 latency | µs local vs 10–50ms network |
| 20 sequential queries | Instant local vs 200ms–1s prod |
| Cache API | API works; edge cache behaviour doesn't |
| DO placement | Single process vs global routing |
| Smart Placement / jurisdiction | Not testable locally |
| External APIs | Different IP/rate limits from Cloudflare egress |

Strategy: **local for logic; remote bindings or staging for integration accuracy.**

---

## Development modes

| Mode | Command / config | Use |
|------|------------------|-----|
| Local (default) | `wrangler dev` | Fast iteration, unit tests, no prod data |
| Remote binding | `remote: true` per binding | Test one real service with latency |
| Force local | `wrangler dev --local` | All simulated |
| Tunnel preview | Press `t` in dev | Webhooks, mobile, colleague preview |

`wrangler dev --remote` deprecated — use per-binding `remote: true`.

---

## Environments (before first line of code)

```toml
[[d1_databases]]
binding = "DB"
database_name = "myapp-dev"
database_id = "dev-id"

[env.staging]
[[env.staging.d1_databases]]
binding = "DB"
database_name = "myapp-staging"
database_id = "staging-id"
```

Same code, different bindings — **never** `if (env === 'production')` in app logic.

Staging: same schema, synthetic volume, refresh schema with prod migrations.

---

## Vite vs Wrangler

- **Vite plugin** — HMR for full-stack; `@cloudflare/vite-plugin`
- **Wrangler** — API-only Workers; remote bindings; always `wrangler deploy` for prod

**Local Explorer** — press `e` in dev: inspect KV/R2/D1/DO state.

---

## Testing pyramid (edge-specific)

- No cold-start testing needed (sub-ms vs Lambda seconds)
- No region testing (global by default)
- **DO coordination** — must test concurrent requests on **real/staging** DO
- Critical paths (auth, payment): integration test regardless of mock complexity

Mock mismatch risk: KV eventual consistency, D1 transactions, R2 conditionals — complex mocks lie.

Workflows: `introspectWorkflow` in vitest-pool-workers — mock steps, disable sleeps.

---

## Debugging production

Categories: Worker crash (stack trace), binding error, external failure, DO coordination (wrong state, no error).

**Trace ID** at edge → propagate to DO/service bindings.

Console logs **sampled** — use Logpush for complete capture.

Toolkit: `wrangler tail` (now), Workers Logs (recent), dashboard analytics, Logpush (archive).

Workflow logs flush at instance completion — dashboard steps for in-flight.

---

## Named failure patterns

| Pattern | Signature | Fix |
|---------|-----------|-----|
| Sequential DB latency | High wall, low CPU | Batch, denormalise, parallelise |
| Subrequest exhaustion | After many fetches | Raise limit (paid), Queue fan-out |
| CPU exhaustion | CPU limit errors | Stream, Queue, Containers |
| Memory pressure | Silent crashes | Stream bodies; don't accumulate |
| KV geo staleness | User A writes, B reads stale | Design for eventual consistency |
| External IP block | Works local, fails prod | Allowlist Cloudflare IPs |

---

## Deployment speed trap

Deploy hits **300+ PoPs in seconds** — CI must block on tests; gradual rollout; `wrangler rollback` practiced before incidents.

Preview: `wrangler deploy --env preview` or Workers Builds branch URLs.

---

## Production notes

- `wrangler dev` for API adapter logic; `remote: true` on Hyperdrive only when debugging pool/RLS against staging Postgres
- OpenNext: `opennextjs-cloudflare preview` — not just `next dev`
- Staging Tunnel + Access mirrors prod auth
- Trace ID from edge through to fleet Python via HMAC headers

---

## Key quotes

> "Works on my machine" #1 cause: timing assumption violation on sequential D1 queries.

> "A bug deploys globally before CI finishes printing test output."

> "Developers who struggle usually distrust local too much or trust it too much."
