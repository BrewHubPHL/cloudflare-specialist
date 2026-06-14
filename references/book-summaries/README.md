# Book summaries

Structured extracts from platform books. One file per processed chapter. Promote durable rules to `patterns/` and `anti-patterns.md` when adopted.

## Sources

| Book | Prefix | Status |
|------|--------|--------|
| [*Architecting on Cloudflare*](https://architectingoncloudflare.com/) (Jamie Lord) | `architecting-on-cloudflare-chXX-*.md` | **26/26 chapters** (May 2026) |
| *Cloudflare for Speed and Security* (Sylvain Kerkour) — PDF at repo root (gitignored) | `cloudflare-book-chXX-*.md` | **9 chapters** (batch 1 + 2 complete) |

## Naming

```
architecting-on-cloudflare-chXX-short-title.md
cloudflare-book-chXX-short-title.md
```

Verify numeric limits against live docs at decision time — summaries capture mental models.

---

## Kerkour — processed

| Ch | Title | Summary | Promoted to |
|----|-------|---------|-------------|
| 1 | Introduction | `cloudflare-book-ch01-introduction.md` | `platform-assessment.md`, kill switches |
| 3 | CDN Caching | `cloudflare-book-ch03-cdn-caching.md` | `cdn-caching.md`, anti-patterns |
| 4 | WAF & Security | `cloudflare-book-ch04-waf-security.md` | `waf-security.md`, kill switches |
| 5 | R2 | `cloudflare-book-ch05-r2.md` | `r2-object-storage.md`, anti-patterns |
| 6 | Workers & Pages | `cloudflare-book-ch06-workers-pages.md` | `workers-best-practices.md`, anti-patterns |
| 7 | Workers AI | `cloudflare-book-ch07-workers-ai.md` | `ai-stack.md`, `workers-ai.md` |
| 8 | Stream | `cloudflare-book-ch08-stream.md` | anti-patterns (alternatives) |
| 9 | Access | `cloudflare-book-ch09-access.md` | `zero-trust-tunnels.md`, `domain-setup-checklist.md` |
| 10 | Conclusion | `cloudflare-book-ch10-conclusion.md` | `platform-assessment.md`, `domain-setup-checklist.md` |

**Not processed (optional):** Ch 2 (Internet fundamentals — reference only, no CF product patterns).

**PDF gaps:** Ch 9 body empty in v2024.x — content synthesized from Ch 4.5 + Ch 10 checklist.

---

## Lord — all chapters processed

| Ch | Title | Summary | Promoted to |
|----|-------|---------|-------------|
| 1 | Developer Platform | `architecting-on-cloudflare-ch01-developer-platform.md` | `workers-fundamentals.md`, Core Principles |
| 2 | Strategic Assessment | `architecting-on-cloudflare-ch02-strategic-assessment.md` | `platform-assessment.md` |
| 3 | Workers: Core Compute | `architecting-on-cloudflare-ch03-workers-core-compute.md` | `workers-fundamentals.md` |
| 4 | Full-Stack Applications | `architecting-on-cloudflare-ch04-full-stack-applications.md` | `full-stack-applications.md`, `opennext-nextjs.md` |
| 5 | Local Dev & Testing | `architecting-on-cloudflare-ch05-local-dev-testing.md` | `local-dev-testing.md` |
| 6 | Durable Objects | `architecting-on-cloudflare-ch06-durable-objects.md` | `durable-objects.md` |
| 7 | Workflows | `architecting-on-cloudflare-ch07-workflows.md` | `workflows.md` |
| 8 | Queues | `architecting-on-cloudflare-ch08-queues.md` | `queues-cron.md` |
| 9 | Containers | `architecting-on-cloudflare-ch09-containers.md` | `containers.md` |
| 10 | Realtime WebRTC | `architecting-on-cloudflare-ch10-realtime-webrtc.md` | `realtime-webrtc.md` |
| 11 | Storage Selection | `architecting-on-cloudflare-ch11-storage-selection.md` | `bindings-storage.md` |
| 12 | D1: SQLite at Edge | `architecting-on-cloudflare-ch12-d1-sqlite-at-edge.md` | `bindings-storage.md` |
| 13 | R2 Object Storage | `architecting-on-cloudflare-ch13-r2-object-storage.md` | `r2-object-storage.md` |
| 14 | KV & Hyperdrive | `architecting-on-cloudflare-ch14-kv-hyperdrive.md` | `kv-hyperdrive.md` |
| 15 | AI Stack | `architecting-on-cloudflare-ch15-ai-stack.md` | `ai-stack.md` |
| 16 | Workers AI | `architecting-on-cloudflare-ch16-workers-ai.md` | `workers-ai.md` |
| 17 | RAG / Vectorize | `architecting-on-cloudflare-ch17-rag-vectorize.md` | `rag-vectorize.md` |
| 18 | Agents SDK | `architecting-on-cloudflare-ch18-agents-sdk.md` | `agents-sdk.md` |
| 19 | Cost Modelling | `architecting-on-cloudflare-ch19-cost-modelling.md` | `cost-modelling.md` |
| 20 | Observability | `architecting-on-cloudflare-ch20-observability-operations.md` | `observability-operations.md` |
| 21 | Security & Compliance | `architecting-on-cloudflare-ch21-security-compliance.md` | `security-compliance.md` |
| 22 | Architectural Patterns | `architecting-on-cloudflare-ch22-architectural-patterns.md` | `architectural-patterns.md` |
| 23 | Multi-Tenant | `architecting-on-cloudflare-ch23-multi-tenant.md` | `multi-tenant.md` |
| 24 | When Not to Use | `architecting-on-cloudflare-ch24-when-not-to-use-cloudflare.md` | `platform-assessment.md`, kill switches |
| 25 | Migration Playbooks | `architecting-on-cloudflare-ch25-migration-playbooks.md` | `migration-playbooks.md` |
| 26 | Building on Cloudflare | `architecting-on-cloudflare-ch26-building-on-cloudflare.md` | `platform-assessment.md` |

## Maintenance

1. **Cross-link audit** — every pattern file references its book chapter(s)
2. **Live doc drift** — periodic limit/pricing verification against Cloudflare docs
3. **Phoenix sample app** — optional cross-walk with `github.com/skerkour/cloudflare-for-speed-and-security`
