# Containers

**Impact:** MEDIUM  
**Tags:** containers, durable-objects, compute, cold-start  
**Book:** Ch.9 — `references/book-summaries/architecting-on-cloudflare-ch09-containers.md`

## Default: stay on Workers

**Workers bill CPU time; Containers bill wall time.** A request spending 3ms computing and 200ms waiting costs ~3ms on Workers and ~203ms on Containers — often **100–500×** more on Containers for I/O-heavy work.

Before Containers: can you **stream**, **chunk**, or write intermediate state to R2/D1?

See `cost-modelling.md` for billing mental model.

---

## When Containers are required

| Constraint | Workers limit | Containers |
|------------|---------------|------------|
| In-process memory | 128 MB | Up to ~12 GB |
| CPU time | ~5 min max | No practical CPU cap |
| Runtime | JS/TS/Python/WASM | Go, Java, .NET, arbitrary Docker |
| Filesystem | None | Up to ~20 GB disk |

**Workers still win on I/O wait** — 5 min wall waiting on APIs is free CPU-wise on Workers.

**Media:** try Media Transformations / Worker bindings before Container transcode.

---

## When Containers can't help

- **>4 vCPU / >12 GB RAM** → hyperscaler (EC2, Cloud Run)
- **Inbound TCP/UDP** from internet (game UDP, MQTT) → traditional cloud + public IP
- **Docker-in-Docker** (CI spawning containers)

---

## Architecture: DO + Container

```
Client → Worker → Durable Object → Container (HTTP)
                      ↑
                 idFromName(userId | poolId | sessionId)
```

- **DO** = routing, coordination, SQLite state across container restarts
- **Container** = ephemeral compute muscle

Sharding strategy = same decision as pure DOs (`durable-objects.md`).

```typescript
// Conceptual: DO forwards to container stub
const id = env.MY_CONTAINER.idFromName(userId);
const stub = env.MY_CONTAINER.get(id);
return stub.fetch(request);
```

---

## Routing strategies

| Strategy | When |
|----------|------|
| **Per-user** | Isolation, substantial per-user state, security boundary |
| **Shared pool** | Stateless or external SSOT; minimise cold starts |
| **Session-sticky** | In-session state without per-user cost |

**Hybrid (recommended for UX):**

```
Worker → validate/auth → respond 202 "processing"
                      → DO/Container async → webhook / WS / poll
```

Never block interactive checkout on 3–15s container cold start.

---

## Cold starts

Typical **3–15 seconds** after sleep — not fixable to sub-second for interactive paths.

Mitigations:

1. **Architectural** — Worker ack immediately; deliver result async
2. **Pre-warm** — lightweight ping before known heavy work
3. **`sleepAfter`** — longer idle before sleep (pay idle wall time)
4. **Image optimisation** — secondary; still seconds

Batch jobs, queue consumers, workflow steps: cold start often acceptable.

---

## Sizing

Start **standard-1** (or smallest that fits); observe 2 weeks before tuning.

| Signal | Action |
|--------|--------|
| OOM kills | Fix leaks first; then increase memory |
| CPU pegged, slow | Increase vCPU or optimise code |
| Disk full | Cleanup temp files; then increase disk |

Cloudflare enforces min **3 GB RAM per vCPU**, max **2 GB disk per 1 GB RAM**.

---

## vs hyperscaler containers

| Choose Cloudflare | Choose hyperscaler |
|-------------------|-------------------|
| Global distribution by default | Native VPC, complex private networking |
| Already on Workers/DO/R2 | >12 GB RAM per instance |
| DO coordination model fits | Deep SQS/Dynamo/BigQuery coupling |

---

## Observability

Propagate trace/request ID Worker → DO → Container.

| Errors in | Likely cause |
|-----------|--------------|
| Container only | Application bug |
| DO + Container | Start failure, OOM, bad image |
| Latency spikes uncorrelated with load | Cold start |

`wrangler containers ssh` for incident debug — not daily ops.

---

## BrewHub

- **Default fleet:** Python agents on Coolify via Tunnel — not Containers unless porting a specific binary
- Container candidate: legacy Go service, GPU-less heavy transcode, queue job needing >128 MB RAM
- Pull queue consumer on fleet may be simpler than Container for hybrid migration
- Interactive shop UX stays on Workers + Hyperdrive → Postgres

Workflow step exceeding Worker memory/CPU → Container binding from Workflow step (verify current integration docs).

---

## References

- [Containers on Cloudflare](https://developers.cloudflare.com/containers/)
- [Durable Objects](durable-objects.md)
- [Workflows](workflows.md) — long steps may delegate to Containers
- [Queues](queues-cron.md) — consumer wall time 15 min; sustained compute → Container
