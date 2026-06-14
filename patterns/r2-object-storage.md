# R2 Object Storage

**Impact:** HIGH  
**Tags:** r2, egress, presigned, events, cdn  
**Sources:** *Architecting on Cloudflare* Ch.13 — [summary](../references/book-summaries/architecting-on-cloudflare-ch13-r2-object-storage.md); *Cloudflare for Speed and Security* Ch.5 — [summary](../references/book-summaries/cloudflare-book-ch05-r2.md)

Zero egress changes economics when objects are **read often**. Prefer **Worker bindings** over S3 SDK from Workers.

---

## When R2 vs S3

| R2 | Stay on S3 |
|----|------------|
| Egress-heavy delivery via Cloudflare | Deep AWS event/IAM integration |
| Workers + CDN architecture | Certified Object Lock / WORM |
| Backup restore you will actually test | Petabyte annual-access archive (Glacier) |
| New Cloudflare-centric projects | Internal-only same-region traffic |

Rule of thumb: migrate when egress > ~30–50% of storage spend and feature gaps acceptable.

---

## wrangler binding (preferred)

```jsonc
{
  "r2_buckets": [{ "binding": "AUDIT", "bucket_name": "webhook-audit" }]
}
```

```typescript
// Stream — don't buffer multi-GB in 128 MB isolate
const object = await env.AUDIT.get(key);
if (!object) return new Response('Not found', { status: 404 });
return new Response(object.body, {
  headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' },
});

await env.AUDIT.put(`events/${id}.json`, body, {
  httpMetadata: { contentType: 'application/json' },
});
```

---

## Access pattern decision tree

```
Need auth/transform/log per request?
  YES → Worker-mediated (default)
  NO + file > 100 MB or huge download volume?
    YES → Presigned URL (short TTL)
    NO + all objects public?
      YES → Public bucket (static assets only)
      NO → Worker-mediated
```

### UGC upload (presigned + async)

1. Worker validates user → returns presigned PUT (5 min TTL)
2. Client uploads directly to R2
3. R2 event notification → Queue → validate/thumbnail/moderate

Handlers must be **idempotent** (at-least-once events).

---

## Public delivery — custom domain only (Kerkour)

**Never use `*.r2.dev` in production:**

- Shared domain reputation (gov blocks, rate limits)
- No zone-level CDN tuning (Argo, cache rules)
- Operational surprise when public URL changes

Attach **custom domain** to bucket → inherits zone SSL, caching, WAF. See `cdn-caching.md`.

---

## CDN + transforms

Public or cacheable Worker responses: set `Cache-Control`. Cache hits avoid R2 Class B ops.

- Images: store originals in R2; resize via `/cdn-cgi/image/...`
- Video: Media Transformations binding for frames/clips — not full transcode (Containers/external)

Custom-domain R2 objects: tune cache at zone level; cross-region routing follows zone plan (verify Argo/routing settings).

---

## Metadata indexing

R2 cannot query "all PDFs by user X". Pattern:

- Object key: UUID or `users/{userId}/{uuid}`
- **D1/Postgres row:** key, filename, owner, mime, created_at

List by prefix OK; cross-dimensional search needs metadata DB.

---

## Storage classes & lifecycle

- **Standard** vs **Infrequent Access** — IA when monthly retrieval < stored volume
- Lifecycle rules via dashboard/API (not wrangler.toml)
- IA cannot transition back — copy to new Standard object if reheating

---

## Log archive / data hub

BrewHub-friendly cheap path:

```
Workers Logs / Logpush → R2 (or Pipelines → Iceberg) → R2 SQL for investigation
```

300 GB/mo logs ≈ dollars in R2 vs hundreds in indexed SaaS platforms.

---

## Migration

- **Sippy:** lazy migrate on first read (watch ETag mismatch)
- **Super Slurper:** bulk from S3/GCS — run from well-connected VM; monitor multi-day jobs
- **rclone:** encrypted sync from fleet or separate provider
- New projects: start on R2 when egress-heavy

---

## Backups & sovereignty (Kerkour kill switch)

**Do not store sole backups in the same Cloudflare account as production.**

Account freeze, billing dispute, or compromise should not destroy only copy of data.

```
Production (CF Workers + R2) ──rclone/sync──► Scaleway / Glacier / Hetzner object store
                                              (encrypted, separate credentials)
```

BrewHub: Postgres backups via Coolify to off-CF storage; R2 for operational blobs only.

---

## Region & latency caveats (Kerkour)

- No explicit bucket **region** picker — location hints / jurisdiction only; plan multi-region latency tests
- S3 API endpoint latency varies by time-of-day and caller region — prefer Worker binding + custom domain for hot paths
- S3 wins economically only for **cold archive** with Intelligent-Tiering — not hot egress workloads

---

## Anti-patterns

See [anti-patterns.md](../anti-patterns.md#r2) — listing hot paths, public UGC buckets, non-idempotent event handlers.

---

## References

- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Event notifications](https://developers.cloudflare.com/r2/buckets/event-notifications/)
- [Ch.13 book summary](../references/book-summaries/architecting-on-cloudflare-ch13-r2-object-storage.md)
- [Ch.5 Kerkour summary](../references/book-summaries/cloudflare-book-ch05-r2.md)
- [CDN caching](cdn-caching.md)
