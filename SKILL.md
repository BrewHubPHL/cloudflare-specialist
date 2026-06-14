---
name: cloudflare-specialist
description: Cloudflare Workers, wrangler, KV, R2, Durable Objects, Queues, Zero Trust tunnels, and OpenNext deployment patterns for edge-first apps.
version: "1.0.0"
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
  - Deploying Next.js via OpenNext on Workers
  - Configuring cloudflared tunnels and Access policies for self-hosted services
  - Debugging workerd vs Node dev differences, cold starts, or connection pooling at the edge
invocation_examples:
  - "Design wrangler bindings for this webhook Worker with R2 audit logs"
  - "Should this state live in KV or a Durable Object?"
  - "Review this tunnel + Access setup for a self-hosted Coolify service"
  - "Fix cold start — what's bloating the OpenNext worker bundle?"
disable-model-invocation: true
---

# Cloudflare Specialist

Edge platform guidance for **Workers**, **wrangler**, storage bindings, and **Zero Trust** exposure of self-hosted backends. Biases toward **retrieval from current Cloudflare docs** over pre-training — limits, flags, and binding shapes change frequently.

## Overview

### Progressive disclosure map

| Need | Load |
|------|------|
| Worker entry, fetch handler, env | `patterns/workers-fundamentals.md` |
| wrangler.jsonc, deploy, dev | `patterns/wrangler-config.md` |
| KV / R2 / D1 choice | `patterns/bindings-storage.md` |
| Coordination / WebSockets | `patterns/durable-objects.md` |
| Queues, cron | `patterns/queues-cron.md` |
| Tunnels + Access | `patterns/zero-trust-tunnels.md` |
| Next.js on Workers | `patterns/opennext-nextjs.md` |
| Mistakes | [anti-patterns.md](anti-patterns.md) |
| Abstract fleet wiring | [examples/brew-hub-integration.md](examples/brew-hub-integration.md) |
| Links | [references/official-docs-links.md](references/official-docs-links.md) |

### Retrieval rule

Before citing numeric limits, binding syntax, or compatibility flags:

1. Search [Cloudflare docs](https://developers.cloudflare.com/workers/llms.txt)
2. Check `node_modules/wrangler/config-schema.json` in the target project
3. Run `wrangler types` after config changes

When docs and memory disagree, **trust the docs**.

---

## Core Principles

### 1. workerd ≠ Node.js

`wrangler dev` can proxy to `workerd`. `next dev` does not. Test Worker code paths with `wrangler dev` or OpenNext `preview`.

### 2. Bindings, not SDK clients

Prefer `env.MY_KV`, `env.MY_BUCKET`, `env.MY_DO` over HTTP calls to Cloudflare APIs from Worker code.

### 3. Stateless by default, stateful on purpose

Workers scale horizontally. Put coordination in Durable Objects; put blob storage in R2; use KV for eventually-consistent cache — not source of truth for money.

### 4. Sovereign self-hosting

Tunnels expose private fleet services without inbound ports. Access is the human door; service tokens are the machine door. Aligns with debt-free self-hosting — no mandatory SaaS control plane for your data path.

### 5. Secrets via wrangler secret / Secrets Store

Never commit API tokens. Use `wrangler secret put` or dashboard Secrets Store bindings.

---

## BrewHub Integration

See [examples/brew-hub-integration.md](examples/brew-hub-integration.md) — API Worker adapter, healthz monitor Access checks, OpenNext edge host, HMAC service tokens to Python tier.

### Kill switches

Escalate when proposals:

- Store payment authority only in KV without Postgres reconciliation
- Open inbound ports on fleet boxes "for debugging"
- Create duplicate Access apps per hostname (breaks wildcard policies)
- Skip `nodejs_compat` on OpenNext Workers

---

## Integration with Other Specialists

| Skill | Handoff |
|-------|---------|
| `nextjs-specialist` | OpenNext config, `'use cache'` on Workers |
| `supabase-specialist` | Hyperdrive / pooler URIs for Worker → Postgres |
| `coolify-hetzner-specialist` | cloudflared on fleet boxes, Traefik origin TLS |
| `brewhub-zero-trust` (in-repo) | Live fleet runbooks — public skill stays abstract |
| `durable-objects` | Deep DO SQLite / WebSocket patterns |

---

## Book-to-skill

Chapter drops → `references/book-summaries/`. Run `node scripts/validate-skill.mjs` before PR.
