# Cost Modelling

**Impact:** HIGH  
**Tags:** billing, optimisation, storage, workers, ai  
**Book:** Ch.19 — `references/book-summaries/architecting-on-cloudflare-ch19-cost-modelling.md`

## Retrieval rule

Book and this file capture **mental models**. Dollar amounts and limits change — verify at [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/) and Billable Usage dashboard before commitments.

---

## Billing mechanics

| Product | Bills for | Design lever |
|---------|-----------|--------------|
| **Workers** | CPU ms (not wall clock) | Parallel I/O cheap; parsing/crypto expensive |
| **KV** | Reads cheap, writes ~10× | Read-heavy cache/flags only |
| **D1** | Rows read/written | Indexes — unindexed scan dominates |
| **R2** | Storage + ops; **$0 egress** | Serve media/API payloads from R2 + CDN |
| **Durable Objects** | Requests + **duration while active** | Must sleep between bursts |
| **Workers AI** | Tokens in/out | Model size × context length × agent loops |
| **Queues** | Write + read + delete per message | Reduce message volume; not batch ops |

---

## Storage = economic choice

```
Read-heavy, rarely updated?     → KV
Write-heavy + SQL queries?      → D1 (or Hyperdrive → Postgres SSOT)
Per-entity coordination?        → Durable Objects
Large binaries?                 → R2
Existing Postgres authority?    → Hyperdrive (don't duplicate SSOT)
```

Wrong primitive fights both code and invoice. KV write-heavy → move to D1/DO. Per-request user state in D1 → DO.

---

## When Cloudflare usually wins TCO

- **Egress-heavy** — TB-scale delivery; R2 + CDN vs hyperscaler egress line item
- **Spiky traffic** — no reserved capacity / provisioned concurrency tax
- **I/O-bound edge** — orchestration, BFF, API gateway (5ms CPU / 500ms wall)
- **Ops simplicity** — single wrangler deploy vs IAM + NAT + cross-AZ + CloudWatch surprises

## When hyperscalers may win

- Sustained CPU-heavy + predictable (reserved instances)
- Deep AWS/Azure service coupling (SQS, Step Functions, IAM fabric)
- GPU **training** (Workers AI = inference only)
- Monolithic relational DB beyond D1 horizontal comfort zone

Present TCO with **migration cost** — $500/mo savings meaningless if migration is $50k engineering.

---

## Warning thresholds (architectural drift)

| Ratio | Likely problem |
|-------|----------------|
| D1 read cost > 10× storage cost | Missing indexes, N+1, full scans |
| KV writes > 50% of KV spend | Counters/session state in KV |
| DO duration > 100× request cost | Heartbeats, polling, WS preventing sleep |
| Workers CPU > 30% of request cost | Compute-heavy — cache, offload, Containers |
| AI > 5× compute (non-AI-primary app) | Prompt bloat, wrong model, agent loops |

---

## Optimisation priority

1. **D1** — `EXPLAIN QUERY PLAN` on hot queries; index WHERE/JOIN columns
2. **Storage alignment** — move data to correct primitive (often 90% cut)
3. **DO lifecycle** — eliminate heartbeats; WebSocket hibernation
4. **AI** — smaller model eval, `max_tokens`, Gateway cache, truncate context, prefix caching
5. **Workers CPU** — only at scale (100M+ req/mo); profile before micro-optimising

**Three-month rule:** engineering time should pay back within 3 months of savings.

---

## Defensive CPU cap

Denial-of-wallet protection — set below P99 legitimate usage with headroom:

```toml
[limits]
cpu_ms = 50
```

Applies to Workers, Durable Objects, Workflows, and queue consumers. Wrong limit → visible failed requests. No limit → invoice surprise.

---

## AI cost model

- Output tokens cost more than input (generation is sequential)
- Default 8B / small — eval before 70B (`patterns/workers-ai.md`)
- Agents: multiply by tool-round LLM calls per user turn
- AI Gateway: cache duplicates, rate limits, spend visibility
- `x-session-affinity` for multi-turn prefix caching discount

---

## Monitoring

**Floor:** Billable Usage dashboard + budget alerts.

**Track:**

- Cost per request (normalise traffic spikes)
- D1 rows per query (trending up = schema/query regression)
- DO active duration per request (sleep health)
- KV write:read ratio (approaching 1:1 → wrong store)

Per-tenant billing meters → **Analytics Engine** (`patterns/observability-operations.md`).

Spike response: traffic proportional? → per-request metrics → recent deploy → D1 query changes → cache hit rate.

---

## Recommended defaults

| Workload | Cost-efficient pattern |
|----------|------------------------|
| Orders / payments | Postgres SSOT on fleet — not D1/KV authority |
| Edge API | Hyperdrive reads; parallel fan-out OK (CPU billing) |
| Static/media | R2 + CDN — not Worker byte streaming |
| Feature flags | KV read-heavy |
| Staff sessions / rate limits | DO per entity — sleep between use |
| Edge AI | Gateway + small model classify; fleet Python for heavy agents |
| Audit archive | R2 + Logpush — not verbose Workers Logs forever |

Set `cpu_ms` on public Workers. Model paid-tier costs before free-tier cliff (100k req/day).

---

## References

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
