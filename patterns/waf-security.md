# WAF & Origin Protection

**Impact:** CRITICAL  
**Tags:** waf, waf-rules, origin, tunnel, asn, turnstile  
**Book:** Kerkour Ch.4 — [summary](../references/book-summaries/cloudflare-book-ch04-waf-security.md)

CDN/WAF protect only traffic that **goes through Cloudflare**. Origin IP discovery bypasses all of it.

---

## Threat model

Attackers find real origin via:

- Historical DNS / certificate transparency (Shodan, Censys, CloudFlair)
- IPv4 scan with `Host:` header matching your domain
- SSRF: RSS readers, webhooks, image proxies forcing server to callback attacker URL

**Symptom:** WAF logs quiet while origin hammered directly.

---

## Mitigation ladder (pick highest feasible)

| Priority | Control | Recommended |
|----------|---------|-----------------|
| 1 | **Cloudflare Tunnel** — no inbound ports | Yes |
| 2 | Firewall **allowlist Cloudflare IPs only** | If tunnel impossible |
| 3 | **Authenticated Origin Pulls** (mTLS) | High-security origin |
| 4 | Separate **egress workers** for outbound fetches | RSS/webhooks off origin IP |

Fetch current IPs: `https://api.cloudflare.com/client/v4/ips` (no auth required).

Tunnel details: `zero-trust-tunnels.md`.

---

## WAF rules that work

### Don't block legitimate bots

Exclude from strict rules:

- `/robots.txt`, `/sitemap.xml`, RSS feeds
- Public API endpoints meant for integrations

### ASN blocking > IP blocking

Individual IP blocks fail — attackers rotate VMs.

1. Lookup ASN: `https://ipinfo.io/<IP>`
2. Check bot ratio: `https://radar.cloudflare.com/traffic/AS<NUM>`
3. WAF custom rule: `(ip.geoip.asnum in { ... })` → **Managed Challenge** (not hard block)

Prefer **Managed Challenge** over block — VPN users live in hosting ASNs too.

### Infrastructure as code

Manage rules in **Terraform** (`cloudflare_zone_custom_firewall`) with comments:

```hcl
# AS14061 DigitalOcean — scraper source 2024-03; challenge not block
```

Opaque ASN lists in dashboard become unmaintainable in months.

### Geo blocking

Policy choice — block countries with no customers/legal exposure. Document in ADR (`architectural-patterns.md`). Recommendation: decide explicitly; don't copy lists blindly.

---

## Rate limiting

Edge rate limits (WAF/Rate Limiting rules) for coarse thresholds.  
Per-user atomic limits at scale: Durable Objects — `architectural-patterns.md`.

Workers tier: see `workers-best-practices.md`.

---

## Turnstile

Replace legacy CAPTCHA on public forms. Integrates with WAF/bot fight mode.  
For managed Turnstile Worker setup see Turnstile skill / Cloudflare docs.

---

## Bot detection vs tracking

Book distinguishes **TLS JA3** / JS fingerprint signals for bot detection from ad-tech tracking. Cloudflare may retain signals — tune logging for compliance (`security-compliance.md`).

---

## Production checklist

- [ ] Fleet services published only via **tunnel** — no `:443` on public Hetzner IP
- [ ] Origin cannot be reached except through Cloudflare (or allowlist verified)
- [ ] Access on human routes; **service tokens** on Worker→origin
- [ ] WAF rules exclude health checks, webhooks, and bot-needed paths
- [ ] ASN/geo rules in Terraform with rationale comments
- [ ] Turnstile on public signup/contact if spam appears

---

## References

- [WAF custom rules](https://developers.cloudflare.com/waf/custom-rules/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Origin pull mTLS](https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/)
- [Ch.4 summary](../references/book-summaries/cloudflare-book-ch04-waf-security.md)
- [Zero Trust tunnels](zero-trust-tunnels.md)
