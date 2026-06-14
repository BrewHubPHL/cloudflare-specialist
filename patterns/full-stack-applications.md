# Full-Stack Applications

**Impact:** HIGH  
**Tags:** ssr, static-assets, spa, frameworks, opennext  
**Book:** Ch.4 — `references/book-summaries/architecting-on-cloudflare-ch04-full-stack-applications.md`

Workers = static assets + SSR + API in one deploy at the edge. OpenNext details: `opennext-nextjs.md`.

---

## Rendering strategy first

| Strategy | Choose when | Cost model |
|----------|-------------|------------|
| **Static** | Content identical for all users | Nearly free at scale |
| **SSR** | SEO, personalisation, can't pre-build all variants | CPU per request |
| **SPA** | Auth dashboards, interactivity > SEO | User device pays JS |
| **Hybrid** | Real products | Per-route mix |

**Default:** static until proven dynamic.

Edge SSR wins fully only with **edge-native data** (D1, KV, R2). SSR + Hyperdrive → fleet Postgres helps but every render still pays cross-network DB latency — use Smart Placement (`workers-fundamentals.md`).

---

## Static assets

```jsonc
{
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "run_worker_first": false
  }
}
```

| Mode | When |
|------|------|
| Asset-first (default) | Mostly static; no auth on assets |
| `run_worker_first: true` | Auth, logging, headers, A/B before any bytes |

Serve from Worker:

```typescript
return env.ASSETS.fetch(request);
```

**Limits (verify):** ~100k files / 500 MB paid bundle — CMS media, uploads, large assets → **R2** (`r2-object-storage.md`).

SPA fallback:

```jsonc
{
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

---

## API + SPA in one Worker

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
```

Single atomic deploy for UI + API.

---

## Edge authentication before assets

For SPAs where unauthenticated users must not receive the bundle:

```typescript
if (!await validateSession(request, env)) {
  return Response.redirect(`${env.LOGIN_URL}?return=${url}`, 302);
}
return env.ASSETS.fetch(request);
```

Requires `run_worker_first: true`.

---

## HTMLRewriter (static + dynamic inject)

Static HTML at CDN; transform per request without full SSR:

```typescript
return new HTMLRewriter()
  .on("#user-name", {
    element(el) {
      el.setInnerContent(session.displayName);
    },
  })
  .transform(await env.ASSETS.fetch(request));
```

Use when structure is static but small values vary. Use SSR when structure depends on data.

---

## Framework choice

| Project | Recommendation |
|---------|----------------|
| New React full-stack | React Router v7 + Cloudflare Vite plugin |
| Content / marketing | Astro |
| Existing Next.js | `@opennextjs/cloudflare` |
| Svelte / Vue | SvelteKit / Nuxt Cloudflare adapters |

Bindings access differs by framework; capability is identical.

Vite plugin: HMR, auto binding types, optional auxiliary Workers (service bindings for shared validation/auth).

---

## Project structure

**Default:** monolithic Worker — route, API, SSR together.

Split into multiple Workers only when:

- Deployment cadence diverges materially
- CPU/memory limits need different configs
- Genuine team or security isolation boundaries

Auxiliary Workers in Vite config = middle ground without separate pipelines.

---

## Caching

- Bundled static files: CDN automatic
- SSR HTML: Cache API with TTL if staleness OK — **per-colo** (miss in Singapore ≠ hit in Frankfurt)
- Cross-zone orange-cloud `fetch()` cache options may be ignored — use Cache API or KV
- Global config on first read → KV, not Cache API

---

## Pages → Workers

New projects: Workers + `[assets]`, not Pages. Existing Pages: mechanical migration — assets dir + explicit Worker routing.

---

## BrewHub

```
OpenNext Worker (UI) + API Worker adapter
  ├── Hyperdrive → Postgres SSOT
  ├── R2 audit exports
  └── Access at edge before protected routes
```

Marketing/docs: static where possible. App: hybrid SSR/SPA with edge session check.

---

## References

- [Static assets](https://developers.cloudflare.com/workers/static-assets/)
- [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
- [OpenNext on Workers](opennext-nextjs.md)
- [Ch.4 summary](../references/book-summaries/architecting-on-cloudflare-ch04-full-stack-applications.md)
