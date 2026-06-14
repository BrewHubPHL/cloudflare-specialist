# Cloudflare Specialist — Navigation

## Pattern priority

| Priority | File |
|----------|------|
| CRITICAL | `workers-fundamentals.md`, `wrangler-config.md` |
| HIGH | `bindings-storage.md`, `zero-trust-tunnels.md` |
| MEDIUM | `durable-objects.md`, `queues-cron.md`, `opennext-nextjs.md` |

## Decision: where to store data?

```
Strong consistency + coordination? → Durable Objects
Blob / object files?              → R2
Edge cache / config / flags?      → KV (eventual consistency)
Relational queries?               → D1 or external Postgres via Hyperdrive
```
