# CDN & Edge Caching

**Impact:** CRITICAL  
**Tags:** cdn, cache-control, cf-cache-status, stale-while-revalidate, tls  
**Book:** Kerkour Ch.3 — [summary](../references/book-summaries/cloudflare-book-ch03-cdn-caching.md)

Highest-ROI Cloudflare win for self-hosted origins (Coolify/Hetzner): **stop paying egress twice** and shield fleet from traffic spikes.

---

## Why cache at Cloudflare

| Benefit | Mechanism |
|---------|-----------|
| Lower origin bandwidth | `HIT` served from edge |
| Lower compute on fleet | Fewer requests hit Traefik/app |
| Faster TTFB globally | Edge PoP vs single Hetzner region |
| Denial-of-wallet resistance | Attack traffic absorbed at edge when cacheable |

Hyperscaler egress ≈ $0.06–0.11/GB; cached responses ≈ **$0 origin egress** for hits.

---

## Debug with `CF-Cache-Status`

```bash
curl -I https://example.com/path | grep -i cf-cache
```

| Status | Meaning |
|--------|---------|
| `HIT` | Served from Cloudflare cache |
| `MISS` | Fetched from origin |
| `REVALIDATED` | Stale; validated via `If-None-Match` / `If-Modified-Since` |
| `DYNAMIC` | Not eligible to cache (default for many HTML routes) |
| `BYPASS` | Origin said don't cache, or cookies/`Authorization` blocked cache |

Fix unexpected `DYNAMIC`/`MISS` with Cache Rules + correct origin headers.

---

## Cache-Control policies (Kerkour defaults)

| Surface | Header |
|---------|--------|
| Dynamic HTML/pages | `public, no-cache, must-revalidate` |
| API (JSON) | `private, no-cache, no-store, must-revalidate` |
| Fingerprinted static | `public, max-age=31536000, immutable` |

**Requires ETag** (or strong validators) for `no-cache` revalidation to work — without ETag, caching gains collapse.

Set at origin middleware or Worker response headers.

---

## Enable origin-controlled caching

Cloudflare **default:** caches only certain extensions — not `/dashboard` or `/page.html`.

**Cache Rules** (replace legacy Page Rules where possible):

1. Match `*` (or path patterns)
2. **Origin Cache Control: On**
3. **Cache level: Cache Everything** (respects your `Cache-Control`)

Verify with `curl -I` until `REVALIDATED` or `HIT` on HTML.

---

## Authenticated content — fatal leak class

CDN cache is **shared**. User A's `/account` must never become User B's `HIT`.

```text
If request has auth cookie → BYPASS cache
```

**Cache Rule example:**

- Field: Cookie → Contains → `session` (your cookie name)
- Action: **Bypass cache**

Also: never cache responses that vary by `Authorization` without explicit `Vary` + bypass policy.

---

## stale-while-revalidate

When staleness is acceptable, SWR improves perceived speed under load. Verify current Cloudflare support and behavior in [cache docs](https://developers.cloudflare.com/cache/) — book emphasizes this as a primary tuning knob.

---

## TLS at edge

Dashboard → SSL/TLS → Edge Certificates:

- **Always Use HTTPS:** on
- **Minimum TLS Version:** 1.2 default; 1.3 if all clients modern
- **HSTS:** enable when stable (understand lock-in)

Full TLS/mTLS origin patterns: `security-compliance.md`, `waf-security.md`.

---

## Custom hostnames (SaaS)

Cloudflare for SaaS: fallback origin + API-managed custom hostnames. **Release** hostnames when customer leaves — duplicate hostname across two Cloudflare SaaS products → Error 1000.

Multi-tenant custom domains: see `multi-tenant.md`.

---

## Self-hosted origin

```
User → Cloudflare (cache HIT for static/OpenNext assets)
     → Tunnel → Coolify/Traefik → app
     → Worker API path (dynamic, no CDN cache)
```

- Cache **public** marketing and immutable assets aggressively.
- Do **not** CDN-cache Hyperdrive/Postgres-backed API responses.
- Pair with `waf-security.md` + `zero-trust-tunnels.md` so origin IP isn't bypass target.

---

## References

- [Cloudflare caching](https://developers.cloudflare.com/cache/)
- [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/)
- [Ch.3 summary](../references/book-summaries/cloudflare-book-ch03-cdn-caching.md)
- [Domain setup checklist](domain-setup-checklist.md) — cache rules + auth bypass
- [Full-stack caching](full-stack-applications.md)
