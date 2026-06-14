# Chapter 15: The AI Stack on Cloudflare

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-15) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/ai-stack.md`, `patterns/workers-ai.md`, `patterns/rag-vectorize.md`, `patterns/agents-sdk.md`

---

## One-line thesis

Cloudflare AI = **operational simplicity + platform integration** — Workers AI for capable open/frontier models; AI Gateway for unified multi-provider inference and observability.

---

## Core trade-off

Workers AI: Llama/Mistral/Qwen workhorses + frontier options (e.g. Kimi K2.6). Not GPT-4/Claude natively — route via AI Gateway when quality gap matters.

Question: **good enough + fast + cheap** vs **best model** — test on real prompts, don't assume.

Best for: AI as **feature** (search, support, classification). Not building ChatGPT clone on Workers AI alone.

---

## Edge AI reality

GPUs **not in every PoP** — Worker → regional GPU cluster (same continent, ~10–50ms) + inference time.

Still beats US-only OpenAI from Europe (~100ms saved on network). Does **not** make long inference instant.

GPU queuing under spike — P99 can spike; build fallbacks (cache, AI Gateway alternate provider, degrade UI).

---

## Product stack

| Product | Role |
|---------|------|
| **Workers AI** | Binding inference — embeddings, classify, summarize, chat |
| **Vectorize** | Vector storage + similarity (RAG building block) |
| **AI Gateway** | Unified `env.AI.run("@provider/model")` — 70+ models, logging, cache, failover |
| **AI Search** | Managed RAG — R2/URLs in, Q&A out; less control |
| **Agents SDK** | Stateful agents on DO — tools, multi-step; Ch.18 depth |

AI Gateway also REST at `api.cloudflare.com` — OpenAI/Anthropic-compatible endpoints, unified billing.

---

## Privacy & compliance

No training on customer data; configurable logging (full / metadata-only via `cf-aig-collect-log-payload: false` / off).

Workers AI GPU locations not fully published — verify residency for regulated workloads.

---

## Failure modes

- Capacity/latency (not just HTTP errors — 5s when 500ms expected)
- Model deprecation — abstract model ID behind config
- **Quality degradation** — HTTP 200 but worse answers; need labeled eval sets, retrieval confidence trends

---

## Cost

Neurons normalize model sizes. Workers AI often 10–500× cheaper than GPT-4 for comparable volume — if quality OK.

Breakpoints: <1k req/day → choose on quality; >1M/day → Workers AI savings fund engineering.

Optimize: smallest passing model, AI Gateway cache, shorter prompts.

---

## Decision tree

1. Need specific GPT-4/Claude/Gemini? → External via AI Gateway
2. Latency-critical + adequate Workers AI quality? → Workers AI
3. On Cloudflare already? → Workers AI + AI Gateway default
4. Hybrid: Workers AI high-volume tolerant tasks; frontier for quality-critical low-volume

Latency budget example (500ms RAG): ~20ms Vectorize + ~100ms 8B generation + ~10ms Worker logic.

---

## Build vs buy

Buy (Intercom, Algolia) when commodity feature, time-to-market > control.

Build on Cloudflare when differentiated AI, tight app integration, avoid per-seat SaaS at scale.

---

## BrewHub notes

- Workers AI + AI Gateway for edge classification, embeddings, light support
- Heavy reasoning / shop-specific agents → fleet Python via Tunnel (Ch.18 split)
- Metadata-only AI Gateway logging for user content
- Quality eval before replacing fleet tier

---

## Key quotes

> "Edge AI means models on the right continent, not in every city."

> "AI Gateway's strategic value is optionality — switching providers is configuration, not a rewrite."

> "Standard monitoring is necessary but insufficient — you need a separate quality signal."
