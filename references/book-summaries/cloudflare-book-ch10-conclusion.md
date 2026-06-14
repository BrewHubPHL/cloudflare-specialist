---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 10: Conclusion"
topics: [hybrid-architecture, billing, enshitification, domain-checklist]
priority: high
added: 2026-06-14
---

## Summary

Author's **reference architecture:** compute/API/database on **Scaleway** (free egress, multi-AZ) + **Cloudflare** for CDN, security, edge Workers, webapp, video, R2 — bills stay predictable as traffic grows. **Unified billing split:** one cloud for API/DB, CF for network/edge — don't merge blindly.

**Future risks:** enshitification (public company lock-in pressure), AWS-style **obscure billing**, product playbook copying hyperscaler complexity.

**Bonus domain checklist (Nov 2024):** Pro plan defaults for modern Go/Node API + SPA — Full (strict) TLS, TLS 1.3, Bot Fight off for SPA stacks, cache bypass on auth cookie/`Authorization`, cache everything else, Smart Tiered Cache, `X-Cdn-Token` transform, www redirect, HSTS in app not dashboard.

## One-line thesis

**Hybrid sovereignty:** cheap compute with free egress behind Cloudflare edge — watch billing complexity and lock-in as platform matures.

## Actionable rules

1. **Reference stack:** Scaleway (or Hetzner/Coolify) origin + Cloudflare front — egress economics + global performance.
2. **Two-vendor billing:** API/DB on compute provider; CDN/Workers/R2 on CF — model costs separately.
3. Monitor **enshitification** signals: pricing opacity, forced bundles, reduced free tiers — document exit triggers in ADR.
4. **Domain checklist** — codify in `patterns/domain-setup-checklist.md` for new zones.
5. Cache Rule (author): bypass if `(http.cookie contains "myapp_auth" || len(authorization) > 0)`; else eligible for cache.
6. Disable Rocket Loader, Early Hints, Bot Fight for modern SPA if app handles security — tune for stack.
7. Serve `security.txt` from app, not CF toggle.

## Production notes

- Direct analog: **Hetzner/Coolify fleet + Cloudflare Workers/Tunnel** — same hybrid economics.
- Checklist auth cookie name → map to your session cookie in Cache Rules.
- Enshitification kill switch: maintain Hono/portable Worker code + off-CF backups (Ch 5).

## Cross-links

- `patterns/platform-assessment.md`
- `patterns/domain-setup-checklist.md`
- `patterns/cdn-caching.md`
- `examples/brew-hub-integration.md`

## Key quotes

> "By deploying this application on Scaleway... free bandwidth... With Cloudflare in front, we can guarantee incredible speed."

> "Enshitification: Cloudflare is a public company which may put some pressure on the executive to build lock-ins and milk their customers for cash."
