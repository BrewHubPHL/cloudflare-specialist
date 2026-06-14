# AI Stack (Strategic Overview)

**Impact:** HIGH  
**Tags:** workers-ai, ai-gateway, vectorize, ai-search, agents  
**Book:** Ch.15 — [summary](../references/book-summaries/architecting-on-cloudflare-ch15-ai-stack.md); Kerkour Ch.7 — [embeddings vs fine-tuning](../references/book-summaries/cloudflare-book-ch07-workers-ai.md)

Strategic layer before implementation. Details: [workers-ai.md](workers-ai.md), [rag-vectorize.md](rag-vectorize.md), [agents-sdk.md](agents-sdk.md).

---

## When Cloudflare AI fits

| Fit | Don't fit |
|-----|-----------|
| AI enhances existing product (search, support, classify) | Product *is* frontier ChatGPT clone |
| Open/frontier Workers AI models pass your eval | Users require GPT-4/Claude quality gap |
| Global users, unified billing/observability | Strict unpublished GPU residency |
| Multi-provider flexibility via AI Gateway | Single provider, every ms counts, no gateway |

**Test prompts** on Workers AI vs external — don't assume quality gap.

---

## Stack map

```
Workers AI     → inference binding (classify, embed, summarize, chat)
AI Gateway     → unified env.AI.run("@provider/model") + logging/cache/failover
Vectorize      → vector index (RAG building block)
AI Search      → managed RAG (R2/URLs → Q&A) — less control
Agents SDK     → DO-backed agents with tools (Ch.18)
```

AI Gateway REST also available outside Workers (`api.cloudflare.com`) with OpenAI/Anthropic-compatible shapes.

---

## Edge AI reality

GPUs run in **regional clusters**, not every PoP. Worker → GPU adds ~10–50ms same continent — still beats transatlantic OpenAI for EU users.

Long generation (seconds) dominates latency — edge saves network, not inference time.

Under load: GPU queueing raises P99 — plan fallbacks (cache, alternate provider, graceful UI degrade).

---

## Product choices

| Need | Start with |
|------|------------|
| Embeddings + custom retrieval | Workers AI + Vectorize → [rag-vectorize.md](rag-vectorize.md) |
| Docs Q&A, good-enough RAG fast | AI Search |
| Production inference | Always AI Gateway (even Workers AI-only today) |
| Simple chat history | DO + Workers AI |
| Tools, multi-step agents | [agents-sdk.md](agents-sdk.md) |

Vectorize limits (verify): e.g. 1536 dims, namespaces for multi-tenant, ~10M vectors/index paid.

---

## Embeddings vs fine-tuning (Kerkour Ch.7)

| Approach | When |
|----------|------|
| **Embeddings + RAG** | Live apps; documents change often; re-embed on update |
| **Fine-tuning** | Stable domain; specialized datasets; infrequent model retrains |

Fine-tuning on every content update is **not realistic** — too slow and GPU-expensive.

Chunk long documents (embedding input limits). Vector stores: **Vectorize**, **pgvector on Postgres** (your SSOT via Hyperdrive), Milvus, Pinecone.

Recommendation: pgvector on fleet Postgres for authoritative doc/shop RAG; Queue-driven re-embed on change.

---

## Hybrid strategy (typical)

| Task | Model path |
|------|------------|
| Embeddings, classification (high volume) | Workers AI |
| Internal summarisation | Workers AI |
| Customer-facing complex reasoning (low volume) | GPT/Claude via AI Gateway |
| Shop-specific heavy agents | self-hosted fleet Python via Tunnel |

AI Gateway = unified cost/latency logging across providers.

---

## Privacy & logging

Cloudflare does not train on customer inference data.

AI Gateway logging levels: full payloads / **metadata-only** (`cf-aig-collect-log-payload: false`) / off.

Production user data: prefer metadata-only. Verify Workers AI residency for regulated workloads.

---

## Quality vs availability monitoring

HTTP 200 with worse answers is a **quality failure** — not caught by error-rate dashboards.

Maintain labeled eval sets; run on schedule. RAG: track retrieval confidence trends ([rag-vectorize.md](rag-vectorize.md)).

Model IDs behind config — catalogue deprecates with notice.

---

## Latency budget (500ms example)

| Component | Budget |
|-----------|--------|
| Worker logic | ~10ms |
| Vectorize retrieval | ~20ms |
| Workers AI 8B short output | ~100ms |
| Headroom | streaming UI if generation longer |

Tight budget → smaller model, cap `max_tokens`, stream tokens, cache repeats.

---

## Cost breakpoints

| Volume | Guidance |
|--------|----------|
| <1k req/day | Choose on quality |
| 100k–1M/day | Workers AI savings matter if quality OK |
| >1M/day | Right-size model; AI Gateway cache; prompt token discipline |

Workers AI often 10–500× cheaper than GPT-4 per task — **if** quality acceptable.

---

## Build vs buy

Buy Algolia/Intercom/etc. when commodity feature and time-to-market beats control.

Build when AI behaviour is differentiated and tightly coupled to app logic.

---

## Recommended default

```
Edge: Workers AI + AI Gateway (classify, embed, light support)
Fleet: Python agents via Tunnel (heavy reasoning, shop tools)
Never: unconstrained agent tools on payment/delete without HITL
```

See kill switches in `SKILL.md`.

---

## References

- [Workers AI](workers-ai.md)
- [RAG / Vectorize](rag-vectorize.md)
- [Agents SDK](agents-sdk.md)
- [Cost modelling](cost-modelling.md)
- [Ch.15 summary](../references/book-summaries/architecting-on-cloudflare-ch15-ai-stack.md)
- [Kerkour Ch.7](../references/book-summaries/cloudflare-book-ch07-workers-ai.md)
