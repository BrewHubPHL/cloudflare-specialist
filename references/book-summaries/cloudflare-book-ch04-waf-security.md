---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 4: WAF & Security"
topics: [waf, tunnel, origin-protection, asn, turnstile, bot-management]
priority: critical
added: 2026-06-14
---

## Summary

WAF and CDN are only as strong as origin exposure. Attackers bypass Cloudflare by discovering real server IPs (historical DNS/TLS, SSRF callbacks, IPv4 host scanning). Mitigations: **Cloudflare Tunnel** (recommended), allowlist Cloudflare IP ranges only, separate egress pool for outbound fetches, or Authenticated Origin Pulls (mTLS). Block bots at **ASN** with Managed Challenge — not individual IPs. Exclude bot-needed paths (`robots.txt`, `sitemap.xml`, RSS). Turnstile for spam; TLS/JA3 fingerprinting for bot detection without necessarily long-term tracking.

## One-line thesis

Lock the **origin** (tunnel + no inbound ports) before tuning WAF rules — otherwise attackers walk around the CDN.

## Actionable rules

1. **Primary:** `cloudflared` tunnel — no open ports; origin HTTP on localhost; TLS at edge.
2. **Alternative:** firewall allowlist [Cloudflare IP ranges](https://api.cloudflare.com/client/v4/ips) on origin.
3. **Alternative:** Authenticated Origin Pulls (mTLS) on origin.
4. Run background jobs that fetch external URLs from **separate egress** (serverless/Workers) — not the origin IP.
5. WAF: challenge/block by **ASN** (`ip.geoip.asnum`), prefer **Managed Challenge** over hard block (VPN users).
6. Exclude RSS, `sitemap.xml`, `robots.txt`, API bot endpoints from ASN blocks.
7. Manage WAF rules in **Terraform** with comments per ASN — not opaque number lists in dashboard.
8. Don't block legitimate bot traffic to APIs/feeds when tightening WAF.
9. Turnstile for forms; rate limiting at edge (see `architectural-patterns.md` for DO counters in Workers path).
10. Fingerprinting (TLS JA3, JS signals) for bot detection — distinct from ad-tech tracking; Cloudflare may store signals.

## BrewHub notes

- **Non-negotiable:** Coolify/Hetzner fleet via tunnel only — matches `zero-trust-tunnels.md`.
- Service tokens for Worker→origin; Access for humans — never duplicate Access apps per hostname.
- Geo-blocking: policy decision for BrewHub — document in ADR if used (support/compliance trade-off).

## Cross-links

- `patterns/waf-security.md`
- `patterns/zero-trust-tunnels.md`
- `patterns/security-compliance.md`
- `references/book-summaries/cloudflare-book-ch03-cdn-caching.md`

## Key quotes

> "While the entry door is locked, the back window is wide open for crooks."

> "Blocking individual IP addresses is a cat-and-mouse game that is lost in advance."
