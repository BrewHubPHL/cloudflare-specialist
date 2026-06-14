# Chapter 3: Workers — The Core Compute Primitive

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-03) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/workers-fundamentals.md`, `patterns/wrangler-config.md`, `anti-patterns.md`

---

## One-line thesis

Workers are single-threaded V8 isolates billed on **CPU time, not wall time** — design for streaming, I/O orchestration, and stateless handlers; push persistence to bindings.

---

## Execution model

| Property | Implication |
|----------|-------------|
| V8 isolate (not VM/container) | ~100× cheaper/faster spawn than process |
| Single-threaded per request | No worker threads; parallelise via `Promise.all` I/O or multiple invocations |
| Isolate may warm between requests | **Never** rely on global mutable state for correctness |
| Handler return ends lifecycle | Orphaned promises may never complete |

### Global scope usage

- **OK:** immutable init (parsed config, compiled regex) — cache where loss is cheap
- **Not OK:** sessions, counters, circuit breaker state — use DO/KV/Postgres

---

## Resource constraints (May 2026 — verify live)

| Limit | Value | Configurable? |
|-------|-------|---------------|
| Memory | 128 MB / isolate | **No** — architectural |
| CPU time | 30s default paid; up to 5 min | Partially |
| Subrequests | 10,000 default; up to 10M | **Yes** via wrangler `limits` |
| Free tier CPU | 10 ms / request | — |

### Hard vs tuneable

- **Hard:** 128 MB memory, 5 min max CPU
- **Tuneable:** subrequest ceiling (safety valve, not infinite — exceed → abrupt failure)

```jsonc
{
  "limits": {
    "subrequests": 50000,
    "cpu_ms": 1000
  }
}
```

Defensive cap for runaway fan-out:

```jsonc
{ "limits": { "subrequests": 10, "cpu_ms": 1000 } }
```

---

## CPU time vs wall time (economic core)

Example API path (~220 ms wall, ~15 ms CPU):

- **Lambda:** pay ~220 ms × memory allocation
- **Workers:** pay ~15 ms CPU — **waiting on fetch/D1/KV is free**

Inverse: compute-heavy workloads converge or favour Lambda's higher memory/time envelope.

### Design for free I/O

- Push work to bindings (R2 transforms, Workers AI)
- Filter in D1/SQL, not in Worker memory
- Cache computed results in KV
- Stream large bodies — never parse 10 MB JSON if proxying

### CPU sinks

- Repeated JSON parse/stringify in hot paths
- String concat in loops
- Heavy validation libraries on every request
- Node compat shims where Web APIs suffice

---

## Subrequest security (same-zone bypass)

| Destination | WAF / edge security |
|-------------|---------------------|
| Same-zone `fetch()` | **Bypasses** zone WAF — trusted internal |
| Cross-zone `fetch()` | Full security stack |

Identify Worker-origin traffic in rules:

```text
(cf.worker.upstream_zone != "" and cf.worker.upstream_zone != "example.com")
```

If internal calls must be WAF-gated: implement checks in Worker or cross zone boundaries deliberately.

---

## Worker placement

| Mode | Use when |
|------|----------|
| Default (global) | Cache-heavy, no backend affinity |
| Smart Placement | Many calls to backends in one region |
| Explicit region hint | Known fixed backend (AWS/GCP/Azure region or probe host) |
| Jurisdictional | Compliance — accepts latency trade-off |

```jsonc
{ "placement": { "mode": "smart" } }
```

```jsonc
{ "placement": { "region": "aws:us-east-1" } }
```

BrewHub: Hyperdrive to fleet Postgres → evaluate Smart Placement or explicit probe toward pooler region.

---

## Service bindings

Microservice modularity **without network latency** when colocated (~0.1–0.5 ms vs 20–300 ms HTTP).

| Style | When |
|-------|------|
| Fetch forwarding | Proxy full Request/Response |
| RPC | Typed methods, narrow params |

Split Workers when: independent deploy cadence, different resource profiles, shared auth Worker, team boundaries — **not** because microservices are fashionable.

---

## `waitUntil()` contract

**Use for:** analytics, external logging, cache warm, cleanup — client already got response.

**Never for:** payment commit, inventory decrement, anything failure must change HTTP status.

Constraints: extends wall time, **not** CPU budget; errors logged only; response already sent.

---

## Named edge failure modes

1. **Orphaned background work** — success response + failed `waitUntil`
2. **Regional backend outage** — aggregate metrics hide geo-localised pain
3. **Isolate state assumption** — globals "work in dev"
4. **Subrequest exhaustion** — fan-out exceeds configured ceiling
5. **Timeout cascade** — slow upstream burns wall budget
6. **Cold cache stampede** — many concurrent regenerations

Circuit breakers need **DO/KV**, not in-isolate memory.

---

## Language notes

| Runtime | Guidance |
|---------|----------|
| JS/TS + Web APIs | Default for new code |
| `nodejs_compat` | Migration / npm packages — no fs, no native addons |
| WASM | CPU-bound islands — same 128 MB / CPU limits |
| Python (Pyodide) | Team skill > perf; ~1s cold start vs sub-ms JS; I/O-heavy OK |

---

## vs Lambda (summary)

| | Workers | Lambda |
|---|---------|--------|
| Cold start | <5 ms | 100 ms–3 s+ |
| Memory max | 128 MB | 10 GB |
| Billing | CPU ms | GB-seconds (wall) |
| Deploy scope | Global default | Per-region |

Workers optimise **web/I/O** workloads; Lambda optimises **flexible compute/memory**.

---

## Promoted patterns

- Stream to R2 instead of buffering uploads
- AbortController timeouts on external fetches (default none)
- Parse JSON once at boundary
- Profile P95 CPU — outliers often regex/loop bugs
- Start monolith Worker; split on measured need

---

## Promoted anti-patterns

- Warm-up pings / provisioned concurrency thinking
- Global mutable rate limits / circuit breakers
- `waitUntil` for money paths
- Filtering large datasets in Worker after wide DB fetch
- Expecting WAF to filter same-zone Worker subrequests
