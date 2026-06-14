# Domain Setup Checklist (Kerkour)

**Impact:** HIGH  
**Tags:** dns, ssl, cache-rules, transform-rules, zero-trust  
**Book:** Kerkour Ch.10 bonus — [summary](../references/book-summaries/cloudflare-book-ch10-conclusion.md)

Author's production defaults for **modern Go/Node API + SPA** (Nov 2024). Tune for BrewHub stack (OpenNext + Worker API + Coolify origin). Legacy PHP/insecure stacks need **more** WAF, not less.

---

## Plan

- **Pro** minimum for advanced cache rules and tiered cache (verify current plan requirements in dashboard)

---

## SSL/TLS

| Setting | Value | Notes |
|---------|-------|-------|
| Encryption mode | **Full (strict)** | Valid origin cert or tunnel |
| Always Use HTTPS | On | |
| HSTS (dashboard) | **Off** | Set HSTS in app when ready — understand lock-in |
| Minimum TLS | **1.3** (author) or 1.2 if legacy clients | BrewHub: 1.2 default unless all modern |
| TLS 1.3 | On | |
| Automatic HTTPS Rewrites | Off | Author preference — avoid double redirects |
| Encrypted Client Hello | On | |
| Certificate Transparency Monitoring | On | |

---

## Security (SPA + hardened API)

Author disables aggressive bot features when Go/Node + SPA reduce XSS/SQLi surface:

| Setting | Author value | BrewHub |
|---------|--------------|---------|
| Bot Fight Mode | Off | Re-enable if scraping abuse |
| Security Level | Medium | |
| security.txt | Serve from **app** | Not CF toggle |
| Browser Integrity Check | On | |
| Challenge Passage | 1 day | |

**Legacy PHP / WordPress:** enable Bot Fight, WAF managed rules, Turnstile — see `waf-security.md`.

---

## Speed

Disable features that break modern bundlers/SSR:

- Speed Brain, Cloudflare Fonts, Early Hints, Rocket Loader → **Off**
- HTTP/2, HTTP/2 to Origin, HTTP/3, Enhanced HTTP/2 Prioritization, 0-RTT → **On**

---

## Caching (critical)

### Configuration

- Caching Level: **Standard**
- Browser Cache TTL: **Respect existing headers**
- Always Online: **Off**
- Development Mode: **Off** (except during debug)

### Cache Rules (author pattern)

**Rule 1 — Bypass authenticated**

```
Expression: (http.cookie contains "myapp_auth" || len(http.request.headers["authorization"]) > 0)
Action: Bypass cache
```

Replace `myapp_auth` with BrewHub session cookie name.

**Rule 2 — Cache everything else**

```
Match: All incoming requests
Cache eligibility: Eligible for cache
Cache key: Sort query string ON
```

Requires **Origin Cache Control** + origin `Cache-Control` + ETags — see `cdn-caching.md`.

### Tiered Cache

- **Smart Tiered Cache Topology**

---

## Origin protection (Transform Rule)

Inject shared secret validated at origin — defense if real IP leaks past tunnel misconfig:

```
Modify Request Rule — all incoming requests
Set header: X-Cdn-Token = [SECRET from wrangler secret / env]
```

Origin (Traefik middleware or app):

```typescript
if (request.headers.get('X-Cdn-Token') !== env.CDN_TOKEN) {
  return new Response('Forbidden', { status: 403 });
}
```

**Not a substitute for tunnel** — belt and suspenders with IP allowlist or tunnel-only routing.

Store secret in **wrangler secret** / fleet env — never in dashboard rule plaintext long-term (rotate via Terraform/API).

---

## Redirects & normalization

- **www → apex** (or reverse per brand): 301, preserve query string
- URL Normalization: Cloudflare type; normalize incoming + to origin

---

## Network

- IPv6, WebSockets, IP Geolocation → On
- Maximum Upload Size → max allowed
- gRPC, Onion Routing → Off unless needed

---

## Scrape Shield

- Email obfuscation, Hotlink protection → Off (author SPA defaults)

---

## New zone workflow (BrewHub)

1. Add zone → Full (strict) → tunnel route (no public origin ports)
2. Apply cache bypass + cache-all rules
3. Access app for human admin routes; service token for Worker→origin
4. Deploy Worker → verify `CF-Cache-Status` on public vs authed paths
5. Document cookie name + CDN token in runbook

---

## References

- [Ch.10 summary](../references/book-summaries/cloudflare-book-ch10-conclusion.md)
- [CDN caching](cdn-caching.md)
- [Zero Trust tunnels](zero-trust-tunnels.md)
- [WAF security](waf-security.md)
