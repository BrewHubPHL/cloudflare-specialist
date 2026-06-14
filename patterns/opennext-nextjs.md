# OpenNext + Next.js on Workers

**Impact:** HIGH  
**Tags:** opennext, nextjs, workers

Handoff detail lives in `nextjs-specialist` `deployment-workers.md`. Cloudflare-specific reminders:

## Feature matrix (verify current docs)

| Feature | OpenNext on Workers |
|---------|---------------------|
| App Router | ✅ |
| Server Actions | ✅ |
| `'use cache'` | ✅ (experimental in Next) |
| Image optimization | ✅ via Cloudflare Images binding |
| Node.js Middleware | ⚠️ Not yet supported |

## Bundle size / cold start

- Keep `@opennextjs/cloudflare` >= 1.3.0 (SSRF CVE fix)
- v1.2+ reduced bundle size by dropping babel preload of all routes
- Run `wrangler check startup` on built worker

## Access + Worker

When protecting `*.workers.dev` or custom domain with Access + service tokens, attach Service Auth to the **existing** wildcard Access app — separate per-worker apps can block legitimate traffic ([opennextjs-cloudflare#1171](https://github.com/opennextjs/opennextjs-cloudflare/issues/1171)).

## References

- [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
