# Chapter 16: Workers AI — Inference at the Edge

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-16) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/workers-ai.md`, `anti-patterns.md`

---

## One-line thesis

Workers AI trades **model breadth and fine-tuning** for **zero-infra bindings and unified billing** — choose for operational simplicity, not because edge makes LLM inference instant.

---

## Edge latency misconception

Typical generation: 500 ms–8 s inference vs ~50 ms saved network hop. **Edge helps embeddings/classification (~20–50 ms), not long generation.**

---

## Decision spectrum

| Approach | When |
|----------|------|
| Workers AI direct | Capable open models OK; simplest path |
| AI Gateway + Workers AI | Production logging, cache, rate limits, cost caps |
| AI Gateway + external (GPT/Claude/Gemini) | Frontier quality + Cloudflare observability |
| External direct | Fine-tuning, provider-specific features |

Hybrid default: **8B/high-volume on Workers AI; escalate quality-critical via AI Gateway.**

---

## What Workers AI cannot do

- **No fine-tuning**
- **No latency SLA** (shared infra; p99 can be 8–12s on 70B)
- Curated model catalogue only (growing — Kimi K2.6, Nemotron for agents)
- Structured output: no constrained decoding — **validate + retry** (15–25% fail complex JSON on small models)

---

## Model selection hierarchy

1. **Start Llama 3.1 8B** — classify, extract, summarize
2. **Move to 70B/Kimi only with measured blind eval** — not intuition
3. **Embeddings:** BGE default — changing model = re-embed entire corpus
4. **Agents/tool use:** evaluate Nemotron 3 Super (MoE) vs 70B
5. **Long context (100k+):** Kimi K2.6 vs RAG — full context costs tokens

Cost lever order: **model size > max_tokens > caching > input trimming**

---

## wrangler + invoke

```toml
[ai]
binding = "AI"
```

```typescript
const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: userQuery },
  ],
  max_tokens: 256,
  temperature: 0.1, // classification: low
});
```

- **Stream** only when UX needs it (>2–3 s generations); complicates error handling
- **Async:** `queueRequest: true` for durable/batch — poll or callback

---

## Prompt engineering (production reality)

- Prompt polish < right model < structured enforcement
- **Prefill assistant JSON** for reliability: `{ role: "assistant", content: '{"category":"' }`
- **Few-shot** essential for 8B instruction following
- Temperature 0 ≠ deterministic — use AI Gateway cache for repeat inputs
- **Prompt injection unsolvable** — delimiter tags + limit blast radius; WAF AI Security layer

---

## Architecture integration

| Pattern | Primitives |
|---------|------------|
| Sync interactive | Worker → AI (<3 s, small model) |
| Async batch | Worker → Queue → AI → KV/R2 |
| Conversation state | **DO per conversation** — truncate/summarize history |
| Large docs | R2 store → retrieve chunks (→ Ch.17 RAG) |
| Cache | AI Gateway exact match; KV for custom keys; `x-session-affinity` for prefix cache |

---

## AI Gateway (production)

- Logging, cache, rate limits, spend caps
- Route external providers through same gateway — unified `env.AI.run()` for 70+ models (verify current catalogue)
- Dynamic routing from dashboard — failover, A/B, no redeploy

---

## vs hyperscalers

**Hyperscaler wins:** fine-tuning, specific GPT/Claude/Gemini families, provisioned throughput SLAs, enterprise connectors (SharePoint etc.), batch discount tiers.

**Workers AI wins:** binding-native ops, unified platform with Workers/R2/Vectorize, managed AI Search for R2/website RAG, gateway observability.

---

## BrewHub notes

- Staff agents on fleet Python tier may call frontier models directly — edge Workers AI for **classification, routing, cheap extraction** at boundary
- Never send payment/PII to models without policy; SSOT stays Postgres
- Sovereignty: prefer fleet-hosted inference for sensitive shop data; Workers AI for non-sensitive edge preprocessing
- Kill switch: assuming Workers AI replaces GPT-4 for all agent reasoning without eval

---

## Promoted anti-patterns

- Choosing Workers AI for sub-100 ms chat latency expectations
- 70B default without quality measurement
- Trusting JSON from 8B without validate/retry
- Full conversation history in every request (cost + context overflow)
- No AI Gateway in production user-facing paths
- Prompt-only defense against injection on untrusted input
