# Cloudflare Specialist — Navigation

## Pattern priority

| Priority | File |
|----------|------|
| CRITICAL | `platform-assessment.md`, `cdn-caching.md`, `domain-setup-checklist.md`, `waf-security.md`, `migration-playbooks.md`, `workers-fundamentals.md`, `workers-best-practices.md`, `wrangler-config.md`, `local-dev-testing.md`, `security-compliance.md`, `kv-hyperdrive.md` |
| HIGH | `bindings-storage.md`, `ai-stack.md`, `architectural-patterns.md`, `full-stack-applications.md`, `multi-tenant.md`, `r2-object-storage.md`, `durable-objects.md`, `workflows.md`, `observability-operations.md`, `queues-cron.md`, `zero-trust-tunnels.md`, `cost-modelling.md` |
| MEDIUM | `workers-ai.md`, `rag-vectorize.md`, `agents-sdk.md`, `containers.md`, `opennext-nextjs.md`, `realtime-webrtc.md` |

## Decision: where to store data?

Work Ch.11 order — access pattern → consistency → coordination:

```
Need atomic read-modify-write / serial execution? → Durable Objects
Blob / object files / zero egress?                  → R2
Read-heavy config, flags, cache (staleness OK)?     → KV
Relational queries + strong consistency?            → D1 (many small DBs) or Hyperdrive → Postgres SSOT
```

Full-stack rendering: `full-stack-applications.md` — static default, SSR needs edge data.

## Operating principles

The fleet-wide philosophy (zero-trust the client, fail closed, idempotency on the money
path, etc.) lives in [PRINCIPLES.md](PRINCIPLES.md). Apply it on top of the domain
patterns in this repo.
