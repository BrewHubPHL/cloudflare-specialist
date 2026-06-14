---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 6: Workers & Pages"
topics: [workers, pages, monolith, cors, smart-placement, hono, portability]
priority: high
added: 2026-06-14
---

## Summary

Workers trade container cold starts for **V8 isolate** constraints but excel at edge latency and local dev (`wrangler dev`). Prefer **monolithic Workers** over micro-function sprawl — communication cost dominates. Use **Hono** (or similar) for portability across Workers/Node/Lambda. Smart Placement helps DB-heavy Workers but is opaque — explicit placement hints preferred when known. **Pages `/api` proxy** eliminates CORS and enables HttpOnly cookies by same-origin routing. D1 author warns against latency-sensitive UI/API on D1 (prefer Hyperdrive/Neon/Postgres for your Postgres SSOT). Exit path: replace bindings with HTTP APIs + Node Dockerfile when outgrowing edge.

## One-line thesis

**Monolith Worker at edge** + same-origin API proxy + Postgres via Hyperdrive — not micro-Workers per route.

## Actionable rules

1. Default architecture: **one Worker** (or UI Worker + API Worker) — not one function per feature.
2. CPU vs wall time: I/O wait is free — orchestrate at edge, compute elsewhere when heavy.
3. Smart Placement for Hyperdrive/HTTP backends; verify with `cf-placement` header; fallback warmup hack if mis-placed (documented in book — prefer explicit `placement.region`).
4. **CORS elimination:** Pages/Worker proxy `/api/*` → fleet or central API — HttpOnly cookies, no localStorage tokens, fewer preflights.
5. Workers routes `*/*` when on Cloudflare DNS — supports customer custom hostnames (multi-tenant).
6. Validate input with **zod** at boundary.
7. Portability: **Hono** — swap adapter to leave Workers without rewriting handlers.
8. Moving off Workers: bindings → HTTP SDKs; wrangler → Node Docker; keep business logic framework-agnostic.
9. Book cautions: new TCP connection per request hurts DB — use Hyperdrive pooler, not raw connects per invocation.
10. Pages consolidation: new projects use Workers + `[assets]` (see `full-stack-applications.md`) — Pages patterns still apply to proxy/CORS lessons.

## Production notes

```
OpenNext Worker (UI) ── same zone ── API Worker ── Hyperdrive ── fleet Postgres
                              └── Tunnel + HMAC ── Python agents
```
- No CORS between UI and API when proxied through same hostname.
- SSOT stays Postgres — not D1 for interactive API (aligns with the self-hosted-SSOT stance).

## Cross-links

- `patterns/workers-best-practices.md`
- `patterns/workers-fundamentals.md`
- `patterns/full-stack-applications.md`
- `patterns/opennext-nextjs.md`

## Key quotes

> "The only serverless projects that I've witnessed succeed are the one deploying monoliths."

> "Don't make cross-origin requests!" (proxy instead)
