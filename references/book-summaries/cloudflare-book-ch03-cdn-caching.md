---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 3: CDN Caching"
topics: [cdn, cache-control, cf-cache-status, tls, stale-while-revalidate]
priority: critical
added: 2026-06-14
---

## Summary

Cloudflare CDN is the highest-ROI optimization for most web apps: cut egress bills, reduce origin load, and improve latency with a few hours of cache configuration. The chapter contrasts hyperscaler egress pricing (denial-of-wallet risk) with Cloudflare’s free egress via caching and the Bandwidth Alliance. Correct caching requires understanding `CF-Cache-Status`, intentional `Cache-Control` policies, ETags for revalidation, and **never caching authenticated responses** without bypass rules.

## One-line thesis

Cache aggressively at the edge with explicit policies — but **bypass cache when auth cookies are present** or you leak user data across the CDN.

## Actionable rules

1. Inspect `CF-Cache-Status` (`HIT`, `MISS`, `REVALIDATED`, `DYNAMIC`, `BYPASS`) when debugging — same semantics as nginx cache status.
2. Default dynamic pages: `Cache-Control: public, no-cache, must-revalidate` + working **ETag** (revalidate every request, serve from edge when unchanged).
3. API routes: `private, no-cache, no-store, must-revalidate` — never cache at shared CDN.
4. Static assets: `public, max-age=31536000, immutable` with fingerprinted filenames.
5. Enable **Origin Cache Control** + **Cache Everything** (Cache Rules) so Cloudflare respects your headers on HTML — default only caches file extensions.
6. **Cache Rule:** bypass when auth cookie present (`Cookie contains session_cookie`).
7. Never cache responses with `Authorization` header content — CDNs may still cache cookie-authenticated pages; treat as fatal leak class.
8. TLS: Always Use HTTPS; min TLS 1.2 (1.3 for SaaS-only modern clients); enable HSTS.
9. Use `stale-while-revalidate` where staleness is acceptable — better UX under load (verify current Cloudflare behavior in docs).
10. Custom hostnames (Cloudflare for SaaS): release hostnames when customer offboards; Error 1000 if two SaaS products claim same hostname.

## BrewHub notes

- Self-hosted Coolify origin behind orange cloud: caching static/OpenNext assets at edge; API `/api/*` uncached or short TTL only if truly public.
- Fleet Postgres responses must not be CDN-cached — Worker/Hyperdrive path is dynamic.
- Bandwidth Alliance relevant if mixing Scaleway/Hetzner compute with Cloudflare front door.

## Anti-patterns promoted

- Caching `/account` or personalized HTML without cookie bypass
- Relying on default extension-only caching for SSR pages
- Using `r2.dev` or shared domains in production (see Ch.5)

## Cross-links

- `patterns/cdn-caching.md`
- `patterns/full-stack-applications.md`
- `patterns/security-compliance.md`
- `anti-patterns.md` (CDN section)

## Key quotes

> "One important thing to always remember, is that a CDN cache is shared by many different users."

> "Counter intuitively, `public, no-cache, must-revalidate` tells the CDN to cache the data, but to revalidate for each request."
