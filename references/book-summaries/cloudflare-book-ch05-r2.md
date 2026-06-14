---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 5: R2"
topics: [r2, egress, s3-migration, custom-domains, backups]
priority: high
added: 2026-06-14
---

## Summary

R2’s economic win is **zero egress** — transformative vs S3 when objects are read often or delivered globally. Storage and request pricing are also lower than S3 for typical workloads; S3 Intelligent-Tiering wins only for rarely accessed cold archives. Operational caveats: **no bucket region picker** (location hints/jurisdiction only), imperfect S3 API parity (checksum gaps), variable latency on S3 API vs public/custom domain, and **never use `r2.dev` in production**. Backups must live in a **separate account/provider** — not the same Cloudflare account as production.

## One-line thesis

R2 for hot, egress-heavy assets; **custom domain** for delivery; **off-platform backups** for sovereignty and account-lock risk.

## Actionable rules

1. Prefer **Worker bindings** over S3 SDK from Workers (also in Ch.13 architecting summary).
2. Public delivery: **custom domain** on bucket — never `*.r2.dev` (rate limits, shared reputation, gov blocks).
3. Custom domain inherits **zone CDN settings** — Argo/routing may send AU users via US if zone plan routing dictates; understand zone config.
4. Migrate: Super Slurper (bulk), Sippy (lazy on read), or **rclone** from well-connected VM; monitor long migrations.
5. Presigned URLs: less origin CPU; configure CORS; good for large uploads bypassing Worker body limits.
6. Parallelize large downloads (`aria2c`, S3 transfer manager).
7. **Do not** store sole backups in same Cloudflare account as production — use Glacier/Scaleway/etc. + encryption (rclone sync).
8. Cross-cloud compute → R2 may see latency spikes during peak hours — prefer Workers colocated with R2 reads.
9. S3 wins: massive cold archive with Intelligent-Tiering only.

## Production notes

- R2 for audit exports, webhook archives, presigned user uploads — metadata in Postgres.
- Backups of fleet Postgres → off Cloudflare (Coolify backup target / separate object store).
- Kill switch: treating R2 as only backup when account can be frozen.

## Cross-links

- `patterns/r2-object-storage.md`
- `patterns/migration-playbooks.md` (S3→R2)
- `patterns/cdn-caching.md` (custom domain + cache)

## Key quotes

> "It's always a bad idea to store your backups on the same cloud provider than the one serving your production environments."

> "Too much magic is the complete opposite of good engineering." (re: bucket placement)
