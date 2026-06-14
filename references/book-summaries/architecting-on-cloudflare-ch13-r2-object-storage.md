# Chapter 13: R2 — Object Storage Without Egress Fees

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-13) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/r2-object-storage.md`, `patterns/bindings-storage.md`, `anti-patterns.md`

---

## One-line thesis

R2's structural advantage is **zero egress** — economics flip when read frequency dominates; use bindings + CDN cache, not S3 SDK from off-platform.

---

## When R2 wins

- Egress > ~30% of storage spend (decisive above ~50%)
- Traffic routes through Cloudflare (Workers, CDN)
- Content delivery, UGC, backups you actually restore, multi-consumer data hub
- S3-compatible migration with Super Slurper / Sippy

## When to stay on S3

- Deep AWS integration (Lambda events, IAM fabric)
- Internal same-region traffic (egress advantage evaporates)
- SEC 17a-4 Object Lock / certified WORM
- True cold archive (Glacier Deep Archive cheaper than R2 IA)
- Egress < 20% of spend + heavy AWS coupling

---

## Economics

| Cost | R2 | S3 pain point |
|------|-----|---------------|
| Egress | $0 | $0.09/GB typical |
| Storage std | ~$0.015/GB-mo | ~$0.023 |
| Class A (write) | $4.50/M | $5/M |
| Class B (read) | $0.36/M | $0.40/M + egress |

High read:repeat ratio → **CDN cache in front** (cache hits ≠ R2 ops). Extreme read volume without cache → ops cost dominates.

---

## Access patterns (default order)

1. **Worker-mediated** — auth, transform, log (default; stream large bodies)
2. **Presigned URLs** — uploads >100 MB, high-volume large downloads; short TTL
3. **Public bucket** — truly public static assets only

UGC flow: Worker authorizes → presigned PUT → R2 event → Queue → process (Workers AI, transforms).

**Local Uploads:** faster global uploads; incompatible with jurisdictional bucket restrictions.

---

## Metadata queryability

R2 has no SQL on objects. Prefix listing OK for `users/{id}/...`. Complex queries → **D1 metadata table** (r2 key, owner, type, FTS) + R2 blob.

---

## Event notifications

At-least-once, not ordered, not instant — **idempotent handlers**. Sync validation only when processing must complete before upload ack.

---

## Storage classes

- **Standard** vs **Infrequent Access** — IA wins when retrieval < stored volume/month
- Not Glacier — annual-access petabytes stay on S3 Glacier
- IA → Standard requires copy, not lifecycle transition back

---

## Gaps vs S3

No Object Lock compliance mode, S3 Select, deep archive tiers, S3 Inventory. Bucket Locks ≠ certified WORM.

---

## BrewHub patterns

- Webhook audit payloads, exports, log archives → R2
- Presigned upload for large fleet exports if needed
- Logpush → R2 (cheap) + optional Pipelines → Iceberg → R2 SQL for investigation
- SSOT remains Postgres; R2 never payment ledger

---

## Promoted anti-patterns

- `list()` as hot path
- Public bucket for UGC "usually public"
- Worker buffering multi-GB files (stream)
- Non-idempotent R2 event handlers
- R2 via S3 SDK from Workers when binding exists
- Expecting Glacier economics from R2 IA
