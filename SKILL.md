---
name: cloudflare-specialist
description: Cloudflare Workers, wrangler, KV, R2, Durable Objects, Queues, Zero Trust tunnels, and OpenNext deployment patterns for edge-first apps.
version: "2.1.0"
tags:
  - cloudflare
  - workers
  - wrangler
  - zero-trust
  - opennext
  - r2
  - durable-objects
when_to_use:
  - Writing or reviewing Workers, wrangler.jsonc, and binding configuration
  - Choosing KV vs R2 vs D1 vs Durable Objects for a workload
  - Evaluating whether a workload fits Cloudflare vs hybrid vs hyperscaler
  - Deploying Next.js via OpenNext on Workers
  - Configuring cloudflared tunnels and Access policies for self-hosted services
  - Debugging workerd vs Node dev differences, cold starts, or connection pooling at the edge
  - Adding Workers AI inference, AI Gateway routing, Agents SDK, or edge vs fleet agent split
  - Modelling Cloudflare billing, storage economics, or cost optimisation trade-offs
  - Designing Workflows, Containers escape hatches, or security/compliance/deployment posture
  - Multi-tenant isolation, migration cutover, or local dev vs staging integration testing
  - Full-stack Workers (static assets, SSR, SPA, OpenNext) or rendering strategy choice
  - Realtime audio/video (WebRTC) vs Durable Object WebSocket coordination
  - Storage primitive selection (KV vs D1 vs R2 vs DO vs Hyperdrive)
  - KV caching semantics, Hyperdrive pooling, or AI stack strategy (Workers AI vs Gateway)
  - Capstone platform fit — horizontal/global/primitives mental models
  - API gateway, BFF, saga, or latency-budget pattern selection
invocation_examples:
  - "Design wrangler bindings for this webhook Worker with R2 audit logs"
  - "Should this state live in KV or a Durable Object?"
  - "Review this tunnel + Access setup for a self-hosted Coolify service"
  - "Fix cold start — what's bloating the OpenNext worker bundle?"
  - "Does this workload belong on Workers or should we keep it on fleet Postgres?"
disable-model-invocation: true
---

# Cloudflare Specialist

Edge platform guidance for **Workers**, **wrangler**, storage bindings, and **Zero Trust** exposure of self-hosted backends. Biases toward **retrieval from current Cloudflare docs** over pre-training — limits, flags, and binding shapes change frequently.

Deep architectural framing from [*Architecting on Cloudflare*](https://architectingoncloudflare.com/) (Jamie Lord) and operational patterns from *Cloudflare for Speed and Security* (Sylvain Kerkour) — chapter summaries in `references/book-summaries/`.

## Overview

### Progressive disclosure map

| Need | Load |
|------|------|
| **Fit / migration / when not to use** | `patterns/platform-assessment.md` |
| **New domain / zone defaults** | `patterns/domain-setup-checklist.md` |
| **CDN cache, CF-Cache-Status, auth bypass** | `patterns/cdn-caching.md` |
| **WAF, origin bypass, ASN blocking** | `patterns/waf-security.md` |
| Gateway, BFF, saga, ADRs, latency budget | `patterns/architectural-patterns.md` |
| AI stack strategy (before implementation) | `patterns/ai-stack.md` |
| Migration playbooks (strangler, dual-write) | `patterns/migration-playbooks.md` |
| Multi-tenant isolation | `patterns/multi-tenant.md` |
| Local dev, testing, simulation limits | `patterns/local-dev-testing.md` |
| Full-stack SSR, static assets, SPA | `patterns/full-stack-applications.md` |
| Worker entry, fetch handler, env, CPU billing | `patterns/workers-fundamentals.md` |
| Monolith Workers, CORS proxy, Hono portability | `patterns/workers-best-practices.md` |
| wrangler.jsonc, deploy, dev | `patterns/wrangler-config.md` |
| KV / D1 / Hyperdrive | `patterns/bindings-storage.md` |
| KV & Hyperdrive deep dive | `patterns/kv-hyperdrive.md` |
| R2 object storage, presigned, events | `patterns/r2-object-storage.md` |
| Coordination / WebSockets / DO SQLite | `patterns/durable-objects.md` |
| Realtime audio/video (WebRTC) | `patterns/realtime-webrtc.md` |
| Durable multi-step orchestration | `patterns/workflows.md` |
| Containers (beyond V8 limits) | `patterns/containers.md` |
| Security, compliance, deploy | `patterns/security-compliance.md` |
| Workers AI / AI Gateway | `patterns/workers-ai.md` |
| RAG / Vectorize / AI Search | `patterns/rag-vectorize.md` |
| Observability, logs, incidents | `patterns/observability-operations.md` |
| Cost modelling, billing feedback | `patterns/cost-modelling.md` |
| Queues, cron, async idempotency | `patterns/queues-cron.md` |
| Agents SDK, MCP, constrained tools | `patterns/agents-sdk.md` |
| Tunnels + Access | `patterns/zero-trust-tunnels.md` |
| Next.js on Workers | `patterns/opennext-nextjs.md` |
| Mistakes | [anti-patterns.md](anti-patterns.md) |
| Abstract fleet wiring | [examples/brew-hub-integration.md](examples/brew-hub-integration.md) |
| Book chapter drops | [references/book-summaries/](references/book-summaries/) |
| Links | [references/official-docs-links.md](references/official-docs-links.md) |

### Retrieval rule

Before citing numeric limits, binding syntax, or compatibility flags:

1. Search [Cloudflare docs](https://developers.cloudflare.com/workers/llms.txt)
2. Check `node_modules/wrangler/config-schema.json` in the target project
3. Run `wrangler types` after config changes

When docs and memory disagree, **trust the docs**. Book summaries capture **mental models**; verify **specific numbers** at decision time.

---

## Core Principles

### 1. workerd ≠ Node.js

`wrangler dev` can proxy to `workerd`. `next dev` does not. Test Worker code paths with `wrangler dev` or OpenNext `preview`.

### 2. Bindings, not SDK clients

Prefer `env.MY_KV`, `env.MY_BUCKET`, `env.MY_DO` over HTTP calls to Cloudflare APIs from Worker code.

### 3. Stateless by default, stateful on purpose

Workers scale horizontally. Put coordination in Durable Objects; put blob storage in R2; use KV for eventually-consistent cache — not source of truth for money.

### 4. CPU time, not wall time

Workers bill computation, not waiting on I/O. Design I/O-heavy orchestration at the edge; push sustained compute to Queues, Containers, or fleet backends.

### 5. Sovereign self-hosting

Tunnels expose private fleet services without inbound ports. Access is the human door; service tokens are the machine door. Postgres SSOT stays on Coolify/Hetzner; Workers handle edge auth, routing, and cache — not payment ledger authority alone.

### 6. Start with Cloudflare; prove you shouldn't

Greenfield: prototype on Workers, validate hard constraints early. Hybrid (edge + fleet Postgres via Hyperdrive) is often optimal — not a compromise to escape.

### 7. Secrets via wrangler secret / Secrets Store

Never commit API tokens. Use `wrangler secret put` or dashboard Secrets Store bindings.

---

## BrewHub Integration

See [examples/brew-hub-integration.md](examples/brew-hub-integration.md) — API Worker adapter, healthz monitor Access checks, OpenNext edge host, HMAC service tokens to Python tier.

### Architecture default

```
Edge Workers (OpenNext + API adapter)
    ├── Hyperdrive → Postgres SSOT (fleet)
    ├── R2 audit / exports
    └── Tunnel + HMAC → Python agents (Coolify)
Access + cloudflared — outbound only; no inbound fleet ports
```

### Kill switches

Escalate when proposals:

- Store payment authority only in KV without Postgres reconciliation
- Require cross-tenant atomic transactions on D1 alone
- Need inbound TCP/UDP to Worker code (non-WebRTC)
- Lift-and-shift legacy without outcome-based migration framing
- Open inbound ports on fleet boxes "for debugging"
- Create duplicate Access apps per hostname (breaks wildcard policies)
- Skip `nodejs_compat` on OpenNext Workers
- Deploy globally without canary/rollback plan
- One Durable Object for all users/tenants (god object throughput ceiling)
- D1 monolith for multi-tenant SaaS instead of Hyperdrive → Postgres SSOT
- Workers AI for all agent reasoning without quality eval vs fleet Python tier
- Queue consumers without idempotency (at-least-once redelivery)
- Unconstrained agent with payment/delete/send tools and no human-in-the-loop
- Write-heavy session state or counters in KV (10:1 write pricing)
- DO heartbeat patterns that prevent hibernation (duration billing runaway)
- Workflow for independent tasks (use Queues) or step payloads >1 MiB without R2 indirection
- Containers for I/O-heavy orchestration without trying Workers streaming first
- Global deploy without canary thresholds and instant rollback plan
- PCI scope with raw card data in Workers instead of processor tokenisation
- Row-level multi-tenant without automatic tenant_id enforcement on every query path
- Big-bang migration or data move before Hyperdrive + edge compute path validated
- Sequential D1/Hyperdrive queries in hot paths without batching (timing assumption violation)
- SSR default for marketing when static generation suffices (CPU per request waste)
- WebSockets for video/voice instead of Cloudflare Realtime WebRTC
- KV as authoritative store for post-payment entitlement or inventory counts
- Hyperdrive query cache enabled on read-after-write paths
- AI features monitored by HTTP status only without quality eval sets
- API gateway accumulating business logic (edge monolith)
- Global rate limit counter in a single Durable Object
- **CDN cache HTML/API without auth cookie bypass** (shared cache user leak)
- **Origin reachable without tunnel or Cloudflare IP allowlist** (WAF bypass)
- **`*.r2.dev` in production** or **sole backups in same CF account** (sovereignty)
- **Cross-origin API + localStorage tokens** when same-origin `/api` proxy is feasible
- **Micro-Worker sprawl** per route before measured split need
- **Single Cloudflare account** for dev/staging/prod (Kerkour Ch.1)
- **Fine-tune LLM on every content update** instead of re-embedding (Ch.7)
- **Cloudflare Stream** without benchmarking alternatives when video is latency-sensitive (Ch.8)

Full fit framework: [patterns/platform-assessment.md](patterns/platform-assessment.md).

---

## Production Patterns (from book)

| Pattern | Guidance |
|---------|----------|
| Global blast radius | One deploy → all PoPs; canary + instant rollback mandatory |
| Smart Placement | Worker near Hyperdrive/Postgres when backend calls dominate latency |
| Service bindings | Worker→Worker without HTTP latency; split on measured need |
| Same-zone subrequests | Bypass WAF — enforce security in Worker for internal calls |
| Lock-in tiers | Low: stateless+R2; High: Durable Objects — accept proportionally |
| One DO per entity | Rate limits, sessions, WS rooms — never one global DO |
| D1 horizontal model | Database-per-tenant; 10 GB is per DB not total cap |
| BrewHub SSOT | Hyperdrive → fleet Postgres; D1 not payment ledger |
| Workers AI | 8B first + AI Gateway; edge doesn't make LLM instant |
| R2 zero egress | Cache in front; presigned for large uploads; metadata in D1/Postgres |
| RAG | AI Search first; low-confidence gate; inference cost dominates |
| Observability | Workers Logs default; requestId propagation; rollback first |
| Queues | At-least-once + idempotent consumers; DLQ monitored; R2→Queue pipelines |
| Agents | DO per user; narrow tools; MCP token indirection; fleet for heavy reasoning |
| Cost | CPU-not-wall; KV read-heavy; D1 index; R2 egress $0; defensive cpu_ms |
| Workflows | One side effect per step; idempotency keys; 1 MiB step results; drain on breaking changes |
| Containers | Wall-time billing; cold start 3–15s; DO+Container; last resort after restructure |
| Security | Edge auth; wrangler secrets; PCI tokenisation; canary deploy; GDPR user_id everywhere |
| Multi-tenant | Metadata in shared D1+KV cache; DO names include tenantId; tiered DB isolation |
| Migration | Strangler first; gradual deploy; Hyperdrive permanent OK; outcomes over parity |
| Local dev | Logic local; integration staging; remote bindings sparingly; env separation |
| Full-stack | Static until dynamic; edge SSR needs edge data; R2 for large assets |
| Storage | Three questions: access, consistency, coordination; one authoritative store |
| Realtime | DO+WS for data; Realtime WebRTC for A/V; budget TURN egress |
| KV/Hyperdrive | How stale? cacheTtl vs expirationTtl; Hyperdrive permanent SSOT OK |
| AI stack | Gateway default; regional GPU not every PoP; quality eval separate from uptime |
| Capstone | Horizontal partition; global deploy discipline; primitives compose |
| Patterns | Latency budget first; gateway trusts backends; ADRs for isolation choices |
| CDN (Kerkour) | `CF-Cache-Status`; ETag + `public,no-cache`; bypass on auth cookie; API `no-store` |
| Origin security | Tunnel first; ASN Managed Challenge; exclude sitemap/RSS; Terraform WAF comments |
| R2 sovereignty | Custom domain delivery; off-CF backups; Worker binding over S3 SDK |
| Workers practical | Monolith default; `/api` proxy kills CORS; Hono for exit path; explicit placement |
| Hybrid hosting (Kerkour) | Scaleway/Hetzner compute + CF edge; split billing; enshitification watch |
| Domain checklist | Auth cache bypass; X-Cdn-Token; TLS 1.3; tiered cache; SPA-tuned WAF off |
| Embeddings (Kerkour) | RAG re-embed on update; pgvector SSOT or Vectorize; not fine-tune per doc |

---

## Book-to-skill (Kerkour — *Cloudflare for Speed and Security*)

| Chapter | Summary file | Promoted to |
|---------|--------------|-------------|
| 1 Introduction | `cloudflare-book-ch01-introduction.md` | `platform-assessment.md`, kill switches |
| 3 CDN Caching | `cloudflare-book-ch03-cdn-caching.md` | `cdn-caching.md`, anti-patterns |
| 4 WAF & Security | `cloudflare-book-ch04-waf-security.md` | `waf-security.md`, `zero-trust-tunnels.md`, kill switches |
| 5 R2 | `cloudflare-book-ch05-r2.md` | `r2-object-storage.md`, anti-patterns |
| 6 Workers & Pages | `cloudflare-book-ch06-workers-pages.md` | `workers-best-practices.md`, anti-patterns |
| 7 Workers AI | `cloudflare-book-ch07-workers-ai.md` | `ai-stack.md`, `workers-ai.md`, anti-patterns |
| 8 Stream | `cloudflare-book-ch08-stream.md` | `platform-assessment.md`, anti-patterns |
| 9 Access | `cloudflare-book-ch09-access.md` | `zero-trust-tunnels.md`, `domain-setup-checklist.md` |
| 10 Conclusion | `cloudflare-book-ch10-conclusion.md` | `platform-assessment.md`, `domain-setup-checklist.md` |

---

## Book-to-skill (Lord — *Architecting on Cloudflare*)

| Chapter | Summary file | Promoted to |
|---------|--------------|-------------|
| 2 Strategic Assessment | `architecting-on-cloudflare-ch02-strategic-assessment.md` | `platform-assessment.md`, anti-patterns |
| 1 Developer Platform | `architecting-on-cloudflare-ch01-developer-platform.md` | `workers-fundamentals.md`, Core Principles |
| 3 Workers | `architecting-on-cloudflare-ch03-workers-core-compute.md` | `workers-fundamentals.md`, anti-patterns |
| 24 When Not to Use | `architecting-on-cloudflare-ch24-when-not-to-use-cloudflare.md` | `platform-assessment.md`, kill switches |
| 6 Durable Objects | `architecting-on-cloudflare-ch06-durable-objects.md` | `durable-objects.md`, anti-patterns |
| 12 D1 | `architecting-on-cloudflare-ch12-d1-sqlite-at-edge.md` | `bindings-storage.md`, anti-patterns |
| 16 Workers AI | `architecting-on-cloudflare-ch16-workers-ai.md` | `workers-ai.md`, anti-patterns |
| 13 R2 | `architecting-on-cloudflare-ch13-r2-object-storage.md` | `r2-object-storage.md`, anti-patterns |
| 17 RAG / Vectorize | `architecting-on-cloudflare-ch17-rag-vectorize.md` | `rag-vectorize.md`, anti-patterns |
| 20 Observability | `architecting-on-cloudflare-ch20-observability-operations.md` | `observability-operations.md`, kill switches |
| 8 Queues | `architecting-on-cloudflare-ch08-queues.md` | `queues-cron.md`, anti-patterns |
| 18 Agents SDK | `architecting-on-cloudflare-ch18-agents-sdk.md` | `agents-sdk.md`, anti-patterns |
| 19 Cost Modelling | `architecting-on-cloudflare-ch19-cost-modelling.md` | `cost-modelling.md`, anti-patterns |
| 7 Workflows | `architecting-on-cloudflare-ch07-workflows.md` | `workflows.md`, anti-patterns |
| 9 Containers | `architecting-on-cloudflare-ch09-containers.md` | `containers.md`, anti-patterns |
| 21 Security | `architecting-on-cloudflare-ch21-security-compliance.md` | `security-compliance.md`, kill switches |
| 23 Multi-tenant | `architecting-on-cloudflare-ch23-multi-tenant.md` | `multi-tenant.md`, anti-patterns |
| 25 Migration | `architecting-on-cloudflare-ch25-migration-playbooks.md` | `migration-playbooks.md`, `platform-assessment.md` |
| 5 Local dev & testing | `architecting-on-cloudflare-ch05-local-dev-testing.md` | `local-dev-testing.md`, `wrangler-config.md` |
| 4 Full-stack | `architecting-on-cloudflare-ch04-full-stack-applications.md` | `full-stack-applications.md`, `opennext-nextjs.md` |
| 10 Realtime WebRTC | `architecting-on-cloudflare-ch10-realtime-webrtc.md` | `realtime-webrtc.md`, `durable-objects.md` |
| 11 Storage selection | `architecting-on-cloudflare-ch11-storage-selection.md` | `bindings-storage.md`, `AGENTS.md` |
| 14 KV & Hyperdrive | `architecting-on-cloudflare-ch14-kv-hyperdrive.md` | `kv-hyperdrive.md`, `bindings-storage.md` |
| 15 AI stack | `architecting-on-cloudflare-ch15-ai-stack.md` | `ai-stack.md`, `workers-ai.md` |
| 26 Building on Cloudflare | `architecting-on-cloudflare-ch26-building-on-cloudflare.md` | `platform-assessment.md`, kill switches |
| 22 Architectural Patterns | `architecting-on-cloudflare-ch22-architectural-patterns.md` | `architectural-patterns.md`, anti-patterns |

---

## Integration with Other Specialists

| Skill | Handoff |
|-------|---------|
| `nextjs-specialist` | OpenNext config, `'use cache'` on Workers |
| `supabase-specialist` | Hyperdrive / pooler URIs for Worker → Postgres |
| `coolify-hetzner-specialist` | cloudflared on fleet boxes, Traefik origin TLS |
| `brewhub-zero-trust` (in-repo) | Live fleet runbooks — public skill stays abstract |
| `durable-objects` | Deep DO SQLite / WebSocket patterns |

Run `node scripts/validate-skill.mjs` before PR.
