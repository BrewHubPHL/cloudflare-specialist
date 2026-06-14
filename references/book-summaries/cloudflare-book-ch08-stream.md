---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 8: Stream"
topics: [stream, video, bunny, r2, alternatives]
priority: low
added: 2026-06-14
---

## Summary

Brief chapter on video delivery. R2 → Stream upload path mentioned. Author **honestly recommends Bunny Stream** over Cloudflare Stream on performance (instant play/seek vs buffering) and cost — hopes Cloudflare improves. Sovereignty/alternatives theme: don't assume CF wins every product category.

## One-line thesis

**Benchmark video CDN before committing** — Bunny Stream beat Cloudflare Stream in author's side-by-side UX test.

## Actionable rules

1. Upload path: R2 object → Stream (when staying CF-native).
2. **Evaluate Bunny Stream** for performance-sensitive video (author's public demo URLs in book).
3. Treat Stream choice as **product decision with exit** — not automatic CF stack extension.
4. If BrewHub adds video: measure seek latency, buffering, egress pricing — not brand loyalty.

## BrewHub notes

- Low priority until video product surface exists.
- Fits "study alternatives when CF isn't competitive" from Ch.1/Ch.10.

## Cross-links

- `patterns/platform-assessment.md` (alternatives)
- `patterns/r2-object-storage.md` (upload source)

## Key quotes

> "I wouldn't feel honest with you if I didn't talk about what I consider to be a service faster and cheaper than Cloudflare Stream: Bunny Stream"
