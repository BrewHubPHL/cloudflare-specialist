# Workers AI

**Impact:** HIGH  
**Tags:** workers-ai, ai-gateway, inference, embeddings  
**Source:** *Architecting on Cloudflare* Ch.16 — [book summary](../references/book-summaries/architecting-on-cloudflare-ch16-workers-ai.md); Kerkour Ch.7 — [embeddings](../references/book-summaries/cloudflare-book-ch07-workers-ai.md)  
**Strategic overview:** [ai-stack.md](ai-stack.md) (Ch.15 + Ch.7)

Binding-native inference — not a substitute for all LLM workloads. Choose for **operational simplicity**; use AI Gateway + external models when quality, fine-tuning, or SLAs require it.

---

## When to use what

| Approach | Use when |
|----------|----------|
| **Workers AI** | Classification, extraction, summarization, embeddings; open models sufficient |
| **AI Gateway + Workers AI** | Production: logging, cache, rate limits, spend caps |
| **AI Gateway + OpenAI/Anthropic/etc.** | GPT/Claude/Gemini quality; unified observability |
| **Fleet / external direct** | Fine-tuning, strict data residency for sensitive shop data |

**Edge myth:** long generation (seconds) dominates latency — edge saves ~50 ms network, not inference time. Edge matters for **embeddings and small fast models**.

---

## wrangler binding

```toml
[ai]
binding = "AI"
```

```typescript
const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [
    { role: "system", content: "Classify support tickets as billing|technical|general." },
    { role: "user", content: ticketText },
  ],
  max_tokens: 50,
  temperature: 0.1,
});
```

---

## Model selection (cost order)

1. **Smallest model that passes blind human eval** — start Llama 3.1 8B
2. **max_tokens** — cap to actual need (classification: ~10–50)
3. **Caching** — AI Gateway exact match; KV for custom keys
4. **Input size** — RAG/chunking vs stuffing context → [rag-vectorize.md](rag-vectorize.md)

Escalate to 70B / Kimi / external only with measured quality gaps — not intuition.

Embeddings: pick one model (e.g. BGE), match Vectorize dimensions — re-embedding is expensive.

---

## Structured output

No constrained decoding on Workers AI — **validate JSON and retry**.

Prefill assistant message to bias JSON:

```typescript
messages: [
  { role: "system", content: 'Return only JSON: {"category":"billing"|"technical"|"general"}' },
  { role: "user", content: ticketText },
  { role: "assistant", content: '{"category":"' },
]
```

Few-shot examples improve 8B instruction following significantly.

---

## Sync vs async

| Pattern | When |
|---------|------|
| Sync in request | Small model, <2–3 s acceptable, interactive |
| `queueRequest: true` | Batch, large context, durable workflows |
| Queue + KV/R2 | User polls or notification later |

Streaming: UX for long replies only — partial failures harder to retry.

---

## Conversation state

Don't resend full history every turn — cost and context limits.

**One Durable Object per conversation** — store messages, summarize/truncate when near context limit.

Large source docs: store in **R2**, retrieve relevant sections — see [rag-vectorize.md](rag-vectorize.md).

---

## AI Gateway (production default)

- Request logging, caching, rate limiting, analytics
- Route external providers through gateway — same operational surface
- Dynamic routing / failover from dashboard without redeploy

Enable for any real user traffic; skip only for prototypes.

---

## Error handling

| Failure | Response |
|---------|----------|
| Transient / rate limit | Backoff retry (expensive in wall time) |
| Capacity | Graceful degrade — rules, cached template, honest message |
| Context too long | Summarize history, chunk documents |
| **Quality** (wrong but 200 OK) | Sample review, user feedback, validation layer |

---

## Security

Prompt injection is not fully solvable — delimiter untrusted input, limit tool/action blast radius, WAF AI Security where available.

BrewHub: don't send payment authority or full PII to models without policy; SSOT stays Postgres.

---

## BrewHub integration

```
Edge Worker → Workers AI (classify/route/extract cheap)
           → AI Gateway → frontier model (quality-critical)
           → Tunnel → Python agents on fleet (sensitive reasoning)
Postgres SSOT unchanged
```

Kill switch: replacing fleet agent stack with Workers AI alone without eval.

---

## References

- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Ch.16 book summary](../references/book-summaries/architecting-on-cloudflare-ch16-workers-ai.md)
- [Kerkour Ch.7](../references/book-summaries/cloudflare-book-ch07-workers-ai.md)
- [RAG & Vectorize](rag-vectorize.md)
- [Agents SDK](agents-sdk.md) — multi-step tool use on DO
- [Cost modelling](cost-modelling.md) — token and model sizing
