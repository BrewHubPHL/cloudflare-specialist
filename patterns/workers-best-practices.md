# Workers Best Practices (Practical)

**Impact:** HIGH  
**Tags:** workers, pages, monolith, cors, hono, portability  
**Book:** Kerkour Ch.6 — [summary](../references/book-summaries/cloudflare-book-ch06-workers-pages.md)  
**Architecture depth:** `workers-fundamentals.md` (Jamie Lord Ch.1/3)

Opinionated operational patterns from *Cloudflare for Speed and Security* — complements isolate-model docs.

---

## Monolith first

Micro-function serverless **fails** operationally:

- Cross-function latency and deployment coupling
- Harder local dev and observability

**Default:** one Worker handles routing + API (+ optional `[assets]`). Split only on measured deploy/security boundaries — `architectural-patterns.md`.

Phoenix book app = reference monolith on Workers.

---

## CPU vs wall time (operational)

Workers bill **CPU ms**, not waiting on Hyperdrive/Tunnel/fleet.

Design edge Workers as **orchestrators**:

- Short validation, auth, cache, routing at edge
- Heavy AI/reasoning on fleet via Tunnel + HMAC
- Don't compute in isolate what Postgres or Python tier should do

---

## Same-origin API — kill CORS

Cross-origin SPA + API costs:

- Double latency (preflight)
- `localStorage` tokens (XSS-sensitive)
- Complex CORS misconfig leaks

**Pattern:** browser calls `https://app.example.com/api/*` only.

```typescript
// Worker or Pages Function — proxy /api to fleet or central API
export async function onRequest(context: { request: Request }) {
  const api = new URL("https://api.internal.example.com");
  const incoming = new URL(context.request.url);
  api.pathname = incoming.pathname.replace(/^\/api/, "") || "/";
  api.search = incoming.search;
  return fetch(new Request(api, context.request));
}
```

Enables **HttpOnly session cookies** on one site — the preferred auth shape at edge.

OpenNext on Workers: same hostname for UI + API adapter Worker.

---

## Smart Placement

When Worker makes **multiple** Hyperdrive/HTTP calls to one region:

```jsonc
{ "placement": { "mode": "smart" } }
```

Or explicit:

```jsonc
{ "placement": { "region": "aws:eu-central-1" } }
```

Check response header `cf-placement`. Book distrusts opaque Smart Placement — **prefer explicit region** when fleet DB location is known (Frankfurt pooler).

Smart Placement limitations (verify docs): HTTP backends; may not help all DB drivers.

---

## Workers routes vs custom domain

On Cloudflare DNS, **Workers routes** (`example.com/*` or `*/*` for all customer hostnames) integrate better with zone features than external DNS custom domain attach.

Multi-tenant custom domains: route `*/*` to dispatch Worker — `multi-tenant.md`.

---

## Input validation

Validate at boundary with **zod** (or similar) before business logic — cheap CPU, high security ROI.

---

## Portability — avoid lock-in

Use **[Hono](https://hono.dev/)** (or fetch-standard handlers) so the same app can run on:

- Cloudflare Workers
- Node (Docker on Coolify exit path)
- Lambda / others with adapter swap

Book exit strategy when scaling past edge DB latency:

1. Replace bindings with HTTP SDK calls
2. Node/tsconfig build target
3. Dockerfile on fleet

Keep domain logic free of Cloudflare-specific APIs except at thin adapter layer.

---

## Database at edge

| Book recommendation | Recommended |
|--------------------|---------|
| Neon/PlanetScale + pooler for generic serverless | **Hyperdrive → fleet Postgres SSOT** |
| D1 not for latency-sensitive UI/API | Agreed — D1 not payment/customer SSOT |

Use transaction pooler URI; Smart Placement toward pooler region.

---

## Rate limiting in Workers

Prefer WAF/DO patterns over in-isolate counters — see `architectural-patterns.md` and `waf-security.md`.

---

## Local dev

```bash
wrangler dev
# Pages legacy: wrangler pages dev public
```

Book emphasizes local dev as first-class vs Lambda emulation complexity — `local-dev-testing.md`.

---

## References

- [Workers llms.txt](https://developers.cloudflare.com/workers/llms.txt)
- [Ch.6 summary](../references/book-summaries/cloudflare-book-ch06-workers-pages.md)
- [Workers fundamentals](workers-fundamentals.md)
- [Full-stack applications](full-stack-applications.md)
