---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 1: Introduction"
topics: [strategy, vendor-lock-in, multi-account, platform-strategy]
priority: high
added: 2026-06-14
---

## Summary

Framing chapter: Cloudflare as fourth-cloud challenger vs AWS/Azure egress pricing and complexity. Author teaches with **vendor lock-in awareness** — when Cloudflare is too proprietary, study alternatives. Platform strategy: man-in-the-middle (CDN/WAF → email, AI Gateway, storage), platform-for-platforms, distribution control ("super app of the cloud"). Operational hygiene: **separate Cloudflare accounts per environment**; attach business payment method early to reduce false-positive account bans.

## One-line thesis

Use Cloudflare for speed/security economics — but **partition accounts**, plan exit paths, and treat fast product churn as operational risk.

## Actionable rules

1. **Multi-account:** at minimum dev (or per-team), staging, production — one mistaken API call must not nuke prod.
2. Attach valid **business payment method** early — reduces abuse-detection false positives (author anecdote).
3. **Vendor lock-in = technical debt** — prefer portable patterns (S3 API, Hono, HTTP APIs over bindings) when exit matters.
4. **Man-in-the-middle mental model:** Cloudflare wins visibility + incremental value without infra rewrites — also concentration risk.
5. Book ships **Phoenix** sample app (GitHub) — full-stack reference, not hello-world snippets.
6. Support quality varies below Enterprise — book compensates with deep operational knowledge.
7. Fast product iteration at Cloudflare is **feature velocity + deprecation risk** — pin `compatibility_date`, read changelogs.
8. Part 1 (Ch 1–4): networking fundamentals — don't skip. Part 2 (Ch 5–9): product chapters, read as needed.

## BrewHub notes

- Aligns with sovereignty: edge on CF, SSOT Postgres on fleet, **not** all eggs in one CF account.
- Phoenix "immortal deploy" metaphor matches debt-free ops — business logic in app, platform runs cheap.
- Denial-of-wallet from hyperscaler egress → BrewHub uses CF CDN + Hetzner/Coolify compute with tunnel.

## Cross-links

- `patterns/platform-assessment.md`
- `patterns/workers-best-practices.md` (Hono exit)
- `references/book-summaries/cloudflare-book-ch10-conclusion.md`

## Key quotes

> "Vendor lock-in is technical debt, can kill your margins, and, in the long term, your business."

> "When Cloudflare solutions are too proprietary for my taste, or not competitive with other providers, we will also study the alternatives."
