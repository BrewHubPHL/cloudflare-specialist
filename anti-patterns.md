# Anti-Patterns

## CDN & caching (Kerkour Ch.3)

### ❌ Caching authenticated HTML without cookie bypass
Shared CDN cache — User A's `/account` becomes User B's `HIT`. Cache Rule: bypass when session cookie present.

### ❌ Assuming CDN won't cache cookie-authenticated pages
`Authorization` and cookies don't auto-bypass — explicit rules required.

### ❌ Default extension-only caching for SSR/dynamic routes
HTML stays `DYNAMIC` — enable Origin Cache Control + Cache Everything + `public, no-cache, must-revalidate` + ETag.

### ❌ Missing ETag on revalidatable pages
`no-cache` without validators → no edge benefit.

### ❌ CDN-caching Hyperdrive/Postgres API responses
Stale or leaked user data — `private, no-store` on API; dynamic at Worker only.

## WAF & origin (Kerkour Ch.4)

### ❌ Orange cloud without origin lockdown
Attackers bypass WAF via discovered origin IP (Shodan, SSRF, Host-header scan).

### ❌ Inbound ports on fleet "because tunnel is slow"
Defeats Zero Trust — tunnel only; allowlist Cloudflare IPs if tunnel impossible.

### ❌ Outbound fetches (RSS, webhooks, image proxy) from origin IP
SSRF leaks real server address — separate egress Worker pool.

### ❌ Blocking individual IPs instead of ASNs
Cat-and-mouse — Managed Challenge on `ip.geoip.asnum`; document in Terraform.

### ❌ WAF rules blocking robots.txt, sitemap, RSS
SEO and integrations break — exclude bot-needed paths.

### ❌ Hard block on hosting ASNs
VPN and legitimate users on DigitalOcean/Hetzner ASNs — prefer Managed Challenge.

## Platform fit (Ch.2, Ch.24)

### ❌ Single Cloudflare account for dev, staging, and production (Kerkour Ch.1)
One API mistake or abuse false-positive can take down all environments — separate accounts minimum.

### ❌ Ignoring enshitification / opaque billing signals (Kerkour Ch.10)
Public-company lock-in pressure — maintain exit path (portable handlers, off-CF backups, hybrid compute).

### ❌ Default to hyperscaler without constraint check
Start with Cloudflare for greenfield; validate hard limits before accumulating switching cost.

### ❌ Lift-and-shift expecting feature parity
Cloudflare rewards native design. "Migrate without changes" + monolithic DB + cross-tenant atomicity → wrong platform.

### ❌ Force-fit via workarounds
Elaborate streaming pipelines to avoid a simple memory-heavy operation — carve out to Containers/external or redesign.

### ❌ Treat hybrid as failure
Edge Workers + Postgres SSOT on fleet (Coolify/Hetzner) is often the long-term architecture, not a transitional phase.

### ❌ Global deploy without rollback discipline
One bad Worker deploy hits all PoPs. No canary, no practised rollback → extended global incidents.

### ❌ Adaptation disguised as architecture
"Durable Objects but we need distributed locks across them" signals fighting the model, not using it.

## Workers

### ❌ Global mutable state across requests
Isolates reuse memory unpredictably. Use DO/KV/Postgres for shared state.

### ❌ In-isolate circuit breakers or rate limit counters
Ephemeral isolates — coordinate through Durable Objects or KV.

### ❌ Warm-up pings / provisioned concurrency thinking
Sub-ms cold starts — this is a Lambda concern, not Workers.

### ❌ `await fetch()` to external API inside long DB transaction
Hold connections briefly — see supabase-specialist.

### ❌ Blocking `waitUntil` promises you need for correctness
`waitUntil` is best-effort; money paths must complete before response.

### ❌ Same-zone fetch expecting WAF protection
Internal Worker→origin calls bypass zone WAF — enforce auth in code.

### ❌ No timeouts on subrequests
Slow upstream consumes wall budget; use AbortController.

### ❌ Repeated JSON parse/stringify in hot paths
Parse once at boundary; CPU time adds up.

### ❌ Filtering large DB results in Worker memory
Push predicates to D1/SQL/Postgres via Hyperdrive.

### ❌ Service Worker syntax in new projects
Use ES module `export default { fetch }`.

## Wrangler

### ❌ Secrets in `vars` or committed wrangler files
Use `wrangler secret put`.

### ❌ Stale `compatibility_date` for years
Miss security/runtime fixes.

### ❌ Skip `wrangler types` after binding changes
Type errors ship to production.

### ❌ Default subrequest limit for massive fan-out
Raise `limits.subrequests` deliberately or redesign — don't assume 1,000 ceiling (legacy) or ignore 10k default.

## Storage

### ❌ KV as payment or inventory SSOT
Eventual consistency + no relational queries.

### ❌ D1 for cross-tenant atomic transfers
No cross-database transactions — use Postgres SSOT or Workflows sagas with eyes open.

### ❌ R2 listing as hot path
List operations are slow — index keys in D1/Postgres.

### ❌ Monolithic D1 when model is multi-tenant
Embrace database-per-tenant or Hyperdrive to existing Postgres.

### ❌ Provision all D1 databases from single-region CI
European users hit 100–150 ms queries — create from edge near user.

### ❌ Unindexed D1 hot queries
Table scans bottleneck the single-threaded actor and explode row-read cost.

### ❌ Replica read immediately after write without session
User sees stale data — use `withSession()` for read-your-writes flows.

## R2

### ❌ R2 `list()` as hot path
Index object keys in D1/Postgres metadata table.

### ❌ Public bucket for user-generated content
One private object breaks the model — use presigned URLs + Worker auth.

### ❌ Non-idempotent R2 event notification handlers
Events are at-least-once — duplicate processing causes double charges/emails.

### ❌ Buffer large uploads/downloads in Worker memory
Stream through R2 binding; presigned URLs for >100 MB uploads.

### ❌ S3 SDK from Worker when R2 binding exists
Use `env.BUCKET` — simpler, no credential rotation in code.

### ❌ `*.r2.dev` URLs in production (Kerkour Ch.5)
Shared reputation, rate limits, no zone cache control — custom domain on bucket.

### ❌ Sole backups in same Cloudflare account as production
Account lock = data loss — off-platform encrypted backups (rclone to Scaleway/Glacier/Hetzner).

### ❌ Expecting explicit R2 bucket region like S3
Location hints only — design latency tests; don't assume Frankfurt bucket.

## RAG / Vectorize

### ❌ Max topK "just in case"
Inference dominates RAG cost — retrieve fewer, better chunks.

### ❌ Mix embedding models without full reindex
Vector spaces incompatible — pick once (BGE 768 default).

### ❌ Treat similarity score as accuracy percentage
0.85 ≠ 85% correct — use thresholds + human spot checks.

### ❌ RAG for live authoritative data
Query Postgres SSOT via Hyperdrive; vectors for unstructured docs.

## Observability

### ❌ Production debugging via `wrangler tail` only
Ephemeral — enable Workers Logs; Logpush to R2 for retention.

### ❌ Global-only error rate alerts
Regional outages hidden — alert per colo + global.

### ❌ Error logs without reproducible input context
No debugger on edge — log method, path, body snapshot, stack.

### ❌ Missing request ID across DO / service binding calls
Cannot reconstruct distributed request — propagate headers.

## Durable Objects

### ❌ God object — one DO for all users/tenants
~1k RPS serial ceiling; shard by entity (`idFromName(userId)`).

### ❌ In-memory DO state without eviction decision
~10s idle evicts memory — persists only in SQLite.

### ❌ Unawaited DO RPC
Dangling promises; silent failures.

### ❌ `await` between coalesced SQL writes and external fetch
Breaks atomic write batching; interleaves input.

### ❌ WebSocket apps without reconnect-on-deploy
Every Worker deploy drops all connections globally.

### ❌ Outgoing external WebSocket expecting hibernation savings
Only incoming client WS hibernates.

## Workers AI

### ❌ Workers AI for instant chat latency expectations
Generation takes seconds; edge saves network rounding error.

### ❌ Default to 70B / frontier without blind eval
Start 8B; measure before paying 5–10×.

### ❌ Trust JSON from small models without validate/retry
15–25% malformed on complex schemas — no constrained decoding.

### ❌ Full conversation history on every request
Use DO per conversation; summarize/truncate.

### ❌ Production user-facing AI without AI Gateway
No logging, cache, rate limits, or spend visibility.

### ❌ Prompt-only defense against injection
Assume untrusted input can steer model — limit actions and data exposure.

## Queues

### ❌ Queue consumer without idempotency from day one
At-least-once redelivery — emails sent twice, charges duplicated; retrofit after incidents is expensive.

### ❌ Batch ack for non-idempotent ETL
Successful records reprocess on partial failure — use per-message ack.

### ❌ Ack before processing completes
Message lost on crash after ack — ack only after durable side effect.

### ❌ Ordering logic on standard queues
No FIFO — use Workflows, DO per entity, or SQS FIFO off-platform.

### ❌ Status tables + sequence numbers on queues
You've rebuilt Workflows — migrate before complexity compounds.

### ❌ Cron for durable async work with retry/DLQ
Cron is schedule-only — enqueue to Queue for at-least-once background jobs.

### ❌ Ignoring DLQ depth
Growing dead letter queue = active incident, not ignorable backlog.

## Cost

### ❌ Write-heavy counters or session state in KV
10:1 read/write pricing — use D1 or Durable Objects.

### ❌ Unindexed D1 queries in hot paths
Per-row billing — million-row scan ≈ $1 per run; index WHERE/JOIN columns.

### ❌ DO heartbeat / presence polling every N seconds
Defeats hibernation economics — KV TTL presence or WebSocket hibernation.

### ❌ Streaming large assets through Workers
Adds CPU per byte — R2 presigned or public bucket + CDN.

### ❌ Default 70B / frontier without eval
10× token cost — start small; measure quality on real queries.

### ❌ No defensive `cpu_ms` cap on public Workers
Runaway regex/recursion → denial-of-wallet — set P99 + headroom.

### ❌ Optimising Workers CPU below 100M req/mo
Engineering time rarely pays back — fix storage and D1 first.

## Storage selection (Ch.11)

### ❌ One monolithic D1 database for all tenants
10 GB per DB by design — partition from day one; DB-per-tenant or Hyperdrive Postgres.

### ❌ KV for subscription status or inventory after payment
~60s eventual consistency — user pays, still sees "free tier" at some PoPs.

### ❌ D1 transactions as distributed lock for rate limits
Concurrent Workers race — one Durable Object per limited entity.

### ❌ Structured queryable data encoded only in KV keys
"Find all users with dark mode" impossible — D1/Postgres authoritative, KV optional cache.

### ❌ Files or exports stored in D1 blobs
SQLite blob bloat — R2 for bytes, metadata row in D1/Postgres.

### ❌ Hyperdrive treated as temporary bridge only
External Postgres is a valid permanent SSOT — a recommended default.

## KV & Hyperdrive (Ch.14)

### ❌ Confusing cacheTtl with expirationTtl
Edge serves stale until cacheTtl elapses even after key expired — document both parameters explicitly.

### ❌ Re-reading KV immediately after write for user confirmation
Expected stale read — return written value or use D1/Postgres/DO.

### ❌ Relying on KV key existence for correctness
Negative caching makes new keys invisible at some edges — use authoritative store.

### ❌ Explicit KV invalidation strategies
No reliable global invalidation — TTL + cache-aside; content-addressable keys if freshness critical.

### ❌ Hyperdrive query cache on write-then-read paths
Cached pre-write result — disable caching for those queries.

### ❌ Long Hyperdrive transactions under load
Holds pool connections — p99 latency before errors; keep transactions seconds not minutes.

### ❌ Single Hyperdrive config for multi-region read replicas
One endpoint only — multiple configs to route reads to nearest replica.

## AI stack (Ch.15)

### ❌ Assuming edge AI runs in every PoP
Regional GPU clusters — long inference still dominates; edge saves network not model time.

### ❌ HTTP 200 as sole AI health signal
Quality degradation without errors — scheduled eval on labeled samples.

### ❌ Skipping AI Gateway for "Workers AI only"
Minimal overhead buys multi-provider optionality and unified observability.

### ❌ Building custom RAG when AI Search suffices
Engineering vanity if retrieval isn't your differentiator — buy/build consciously.

### ❌ Frontier model for every task without eval
10–500× cost — smallest passing model first.

## Full-stack (Ch.4)

### ❌ SSR for content that could be static
CPU per request for marketing pages — static until proven dynamic.

### ❌ Edge SSR without edge or pooled data
Renderer at edge, Postgres round-trip every render — partial latency win only.

### ❌ Large media bundled in Worker deploy
500 MB / 100k file limits — R2 for CMS, uploads, long-lived assets.

### ❌ `run_worker_first` without need
Every static asset burns Worker CPU — default asset-first until auth/logging required.

### ❌ Cache API for globally identical SSR on first read
Per-colo only — use KV for config; accept colo miss or replicate via KV.

### ❌ Splitting into multiple Workers preemptively
Service binding latency + deploy coordination — monolith until measured need.

## Architectural patterns (Ch.22)

### ❌ Gateway with embedded business logic
Becomes edge monolith — every feature change requires gateway deploy; extract to backend Workers.

### ❌ Backends re-validating auth when gateway already did
Gateway adds latency without value — trust injected identity or skip gateway.

### ❌ Global rate limit in one Durable Object
All users route to single object — distant users pay 100–200ms per check; key per user/API key.

### ❌ Premature Queues for synchronous operations
Caller needs success/failure now — use direct call; queue adds debug complexity.

### ❌ Saga step without compensation
Reserve inventory/charge card without defined release/refund step — leaked state on failure.

### ❌ Skipping ADRs for tenant isolation / SSOT choices
Future team can't reconstruct why Hyperdrive Postgres vs D1-per-tenant was chosen.

## Multi-tenant

### ❌ SSR for content that could be static
CPU per request for marketing pages — static until proven dynamic.

### ❌ Edge SSR without edge or pooled data
Renderer at edge, Postgres round-trip every render — partial latency win only.

### ❌ Large media bundled in Worker deploy
500 MB / 100k file limits — R2 for CMS, uploads, long-lived assets.

### ❌ `run_worker_first` without need
Every static asset burns Worker CPU — default asset-first until auth/logging required.

### ❌ Cache API for globally identical SSR on first read
Per-colo only — use KV for config; accept colo miss or replicate via KV.

### ❌ Splitting into multiple Workers preemptively
Service binding latency + deploy coordination — monolith until measured need.

### ❌ Cross-origin SPA + API with localStorage tokens (Kerkour Ch.6)
Preflight latency + XSS token theft — proxy `/api/*` same origin; HttpOnly cookies.

### ❌ Hono-free handlers locked to Workers-only APIs everywhere
No exit path — thin adapter layer; business logic portable to Node Docker on fleet.

## AI / RAG (Kerkour Ch.7)

### ❌ Fine-tuning on every document or FAQ update
Impractical cost/latency — re-embed changed docs; fine-tune only for stable specialized models.

### ❌ Vectorize-only when Postgres SSOT already holds shop data
pgvector via Hyperdrive may be simpler authoritative RAG — pick one SSOT for embeddings metadata.

## Video (Kerkour Ch.8)

### ❌ Cloudflare Stream without benchmarking alternatives
Author found Bunny Stream faster/cheaper for seek/buffer UX — evaluate before committing.

## Realtime (Ch.10)

### ❌ WebSockets for video or voice streams
TCP retransmission adds latency — Cloudflare Realtime (WebRTC) for media.

### ❌ Mesh WebRTC for large calls
Bandwidth grows O(n²) — SFU required beyond ~4 participants.

### ❌ Realtime infrastructure for text chat or cursors
DO + WebSockets suffice — don't add SFU cost/complexity.

### ❌ Ignoring TURN in connectivity budget
8–15% calls fail without relay — plan ~15% consumer / ~30% enterprise TURN egress.

### ❌ App session state without reconciling Realtime events
Ghost participants, stale tracks — handle join/leave/track-ended; resync on reconnect.

## Multi-tenant

### ❌ Row-level isolation without enforced tenant filter
One missing `WHERE tenant_id` = breach — ORM scopes, views, integration tests for cross-tenant access.

### ❌ D1 monolith for multi-tenant SaaS payment data
Use Hyperdrive → Postgres SSOT; D1 horizontal model is DB-per-tenant, not one 100 GB DB.

### ❌ Workers for Platforms for config-only customisation
JSONPath, rules, templates first — tenant code is permanent operational tax.

### ❌ Dispatch namespace without outbound Worker
Tenant `fetch()` can probe internal network — block, audit, inject creds explicitly.

### ❌ Per-request metering writes to D1
Metering cost exceeds work — batch counts, sample at scale; DO for hard quotas only.

### ❌ Custom domain only — no platform subdomain fallback
DNS/cert failures break tenant — keep `tenant.yourapp.com` always available.

## Migration

### ❌ Big-bang cutover without coexistence period
Run strangler + gradual deploy; keep rollback 30 days.

### ❌ Data migration before compute on Hyperdrive proven
Dual-write complexity before edge path validated — Hyperdrive permanent architecture is OK.

### ❌ Migration without baseline metrics
Can't prove success — measure p50/p95/p99 and cost before moving traffic.

### ❌ Treating KV as Redis drop-in during Redis migration
1 write/sec/key, ~60s consistency — decompose cache vs counters vs sessions.

## Workflows

### ❌ Workflow for independent idempotent tasks
Orchestration overhead with no step dependencies — use Queues.

### ❌ Large payloads in step return values
1 MiB JSON limit per step — R2 reference + key in result.

### ❌ Non-deterministic logic outside steps
Replay breaks on random/timestamp branching — wrap in `step.do()`.

### ❌ One step with multiple external writes
Partial failure retries duplicate earlier writes — one side effect per step + idempotency keys.

### ❌ waitForEvent without timeout
Workflows hang silently when event source fails — always timeout + escalation.

### ❌ Rename/remove steps on running workflow type
Breaks replay — new workflow class + drain old instances.

### ❌ Breaking service binding RPC while workflows sleep
Sleeping instances call old interface for days — version bindings like public API.

## Containers

### ❌ Containers for I/O-heavy API orchestration
Wall-time billing vs Workers CPU billing — often 100–500× more expensive.

### ❌ Containers before streaming/chunking attempt
Restructure to Workers + R2 streams first — one week refactor often pays back at scale.

### ❌ Interactive UX blocked on container cold start
3–15s cold start — Worker ack async; never hold checkout on container wake.

### ❌ Inbound TCP/UDP game/MQTT on Containers
Not supported — hyperscaler with public IP + load balancer.

### ❌ Per-user container for stateless pool workload
Unnecessary cold starts and cost — shared pool when isolation not required.

## Security & deployment

### ❌ Trusting isolate model for app security
Isolates protect multi-tenancy, not your logic bugs or binding misconfig.

### ❌ Staging Worker bound to production D1/KV
Environment separation via bindings only — same code, different resources.

### ❌ Environment conditionals instead of feature flags
Staging doesn't test production code paths — KV flags behave identically.

### ❌ Global deploy without canary criteria
One deploy hits all PoPs — define error/latency thresholds before rollout.

### ❌ Raw card data through Workers
PCI scope explosion — processor tokenisation only; Postgres holds business state.

### ❌ GDPR deletion without cross-store user_id map
Data spread across D1/R2/KV/DO without tractable delete path.

### ❌ Broad tunnel access instead of VPC Service binding
SSRF pivot risk — bind specific endpoints where VPC Services available.

## Zero Trust

### ❌ Inbound port-forward "temporarily" on fleet boxes
Defeats tunnel architecture; Docker bypasses ufw anyway.

### ❌ Duplicate Access app per subdomain
Breaks wildcard policies; attach policies to existing apps.

### ❌ Access on websocket hostnames
Use private channels + session auth instead.

### ❌ Deploy Worker depending on Access before policy exists
Sequence: Access policy first, deploy second.

## OpenNext

### ❌ `@opennextjs/cloudflare` < 1.3.0
Known SSRF — upgrade.

### ❌ Only `next dev` before production Worker deploy
Use `opennextjs-cloudflare preview`.

## Agents

### ❌ Agent when RAG or Workflows suffice
Agents cost 5–50× LLM calls per turn — autonomous tool use only when justified.

### ❌ Monolithic agent with dozens of tools
Split by security boundary or use Code Mode — vague descriptions → wrong tool selection.

### ❌ Passthrough upstream OAuth tokens to MCP clients
Issue server tokens — upstream compromise becomes full API access.

### ❌ All tools registered for all users
Permission-based registration — undefined tools can't be hallucinated into existence.

### ❌ Untrusted tool output in LLM context raw
Prompt injection via ticket/email content — structured data, sanitise, limit exfil tools.

### ❌ Multi-agent orchestration as default
Start one agent — coordination latency and context loss accumulate.

### ❌ Citing Worker limits from memory
Fetch current docs every session.

### ❌ Waiting for 128 MB or 10 GB D1 limits to "go away"
Architectural constraints — design within them or choose Containers/external.
