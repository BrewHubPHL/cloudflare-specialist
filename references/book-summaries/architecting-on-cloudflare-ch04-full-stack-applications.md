# Chapter 4: Full-Stack Applications

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-04) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/full-stack-applications.md`, `patterns/opennext-nextjs.md`, `wrangler-config.md`

---

## One-line thesis

Workers collapse CDN + app server + API into one edge deploy — decide **rendering strategy first** (static → SSR → SPA), then whether data is edge-native or origin-bound.

---

## Rendering decision

| Strategy | When | Cost |
|----------|------|------|
| **Static** | Marketing, docs, rarely changes | Storage + bandwidth (~free) |
| **SSR** | SEO, personalisation, fresh data | CPU per request |
| **SPA** | Dashboards, auth-only, high interactivity | User pays JS bundle cost |
| **Hybrid** | Most real apps | Mix per route |

Default: **static until proven dynamic**. SSR only when you can't pre-generate variations.

Edge SSR full win requires **edge data** (D1, KV, R2 cache) — SSR + central Postgres via Hyperdrive is partial benefit.

---

## Static assets

```toml
[assets]
directory = "./public"
```

- Default: asset-first (faster, cheaper)
- `run_worker_first = true` + `binding = "ASSETS"` when auth/logging/A-B must run before static
- Limits: 100k files / 500 MB paid — large/media → **R2**, not bundle
- Pages → Workers: `[assets]` replaces `pages_build_output_dir`

SPA:

```toml
not_found_handling = "single-page-application"
```

---

## SSR & HTMLRewriter

- **Streaming** helps when TTFB > ~100–300ms perceptual threshold
- **HTMLRewriter**: static HTML cached + per-request surgical inject (auth badge, A/B) — constant memory; not full SSR
- Raw HTML strings OK for small apps; frameworks for scale

---

## Frameworks (new projects)

| Framework | Cloudflare fit |
|-----------|----------------|
| **React Router v7** | Default React full-stack |
| **Astro** | Content + islands |
| **SvelteKit / Nuxt** | Official adapters |
| **Next.js** | OpenNext — migrate existing; heavier for greenfield |
| **TanStack Start / RedwoodSDK** | Cloudflare-first |

Bindings via `context.cloudflare.env` (React Router), `Astro.locals.runtime.env`, `platform.env` (SvelteKit).

Vite plugin: HMR, types, RSC `childEnvironments`, auxiliary Workers via service bindings.

---

## Structure

**Default:** one Worker — routing, API, SSR, assets together; atomic deploy.

Split when: deployment frequency diverges, CPU config conflicts, team boundaries, security isolation — not preemptively.

---

## Caching notes

- Static assets: automatic CDN cache; new deploy = new URLs
- SSR HTML: Cache API when staleness OK — **per-colo** (not global like KV)
- `fetch()` cache options **ignored** on cross-zone orange-cloud origins — use Cache API or KV
- API: usually no cache; short TTL for read-heavy OK endpoints

---

## Edge auth for SPA

Worker validates session **before** `ASSETS.fetch()` — unauthenticated users never receive JS shell (compliance / proprietary logic).

---

## BrewHub notes

- OpenNext on Workers for UI; API adapter Worker for fleet/Hyperdrive
- Public marketing static where possible; authenticated app SSR/SPA with edge auth
- Asset limits → R2 for uploads/exports; presigned patterns in `r2-object-storage.md`

---

## Key quotes

> "Edge SSR only delivers full latency benefits when data is also at the edge."

> "Workers are the platform — static, SSR, and API are capabilities, not separate products."

> "Don't split preemptively because you might need independent scaling someday."
