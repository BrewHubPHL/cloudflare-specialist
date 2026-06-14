---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 9: Access (stub + Ch 4.5 tunnel)"
topics: [access, tunnel, zero-trust, origin-protection]
priority: high
added: 2026-06-14
---

## Summary

**PDF note:** Ch 9 is a title page only in v2024.x — no body text. Access/Tunnel operational content lives in **Ch 4.4–4.5** and the **Ch 10 domain checklist** (`X-Cdn-Token` origin header). Consolidated here for skill completeness.

**Tunnel (recommended):** `cloudflared` outbound-only; no open ports; origin HTTP on localhost; edge TLS managed by Cloudflare. Create via Zero Trust → Access → Tunnels → Docker install command.

**Alternatives:** Cloudflare IP allowlist on origin firewall; separate egress pool for background fetches; Authenticated Origin Pulls (mTLS).

**Origin hardening checklist (Ch 10):** Transform Rule injects secret `X-Cdn-Token` on all requests — origin rejects requests missing header (defense if IP leaked). Pair with tunnel, not instead of.

## One-line thesis

**Tunnel + Access** for humans/service tokens — plus **origin secret header** so bypass traffic fails even if IP is discovered.

## Actionable rules

1. Dashboard: **Zero Trust → Access → Tunnels** — managed tunnel per server/cluster.
2. No inbound ports on fleet — `cloudflared` initiates connections.
3. Background jobs fetching external URLs → **separate Worker/egress pool**, not origin IP.
4. **Access apps** for human admin/API surfaces; **service tokens** for Worker→origin (see `zero-trust-tunnels.md`).
5. **X-Cdn-Token** (or similar) via Transform Rule — origin middleware validates (Ch 10 checklist).
6. mTLS origin pulls when tunnel + allowlist insufficient — SSL/TLS → Origin Server.

## BrewHub notes

- Matches existing invariants: one tunnel per machine, Access before Worker deploy, no WS Access on handshake hostnames.
- Coolify/Traefik: `https://localhost:443` + Origin Server Name + No TLS Verify when edge terminates.

## Cross-links

- `patterns/zero-trust-tunnels.md`
- `patterns/waf-security.md`
- `patterns/domain-setup-checklist.md`
- `references/book-summaries/cloudflare-book-ch04-waf-security.md`

## Key quotes

> "With Cloudflare Tunnel, you don't need to open any port of your servers or clusters."

> (Ch 10 checklist) Set `X-Cdn-Token` header on all incoming requests — validate at origin.
