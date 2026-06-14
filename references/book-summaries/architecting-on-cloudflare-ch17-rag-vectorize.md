# Chapter 17: Building RAG Applications

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-17) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/rag-vectorize.md`, `patterns/workers-ai.md`, `anti-patterns.md`

---

## One-line thesis

RAG turns hallucination into **misquotation** (fixable) — but bad retrieval with citations is **harder to catch** than obvious hallucination; optimise **inference cost** first (~95% of ongoing spend).

---

## Cost centres

1. Embedding (index once + per query) — cheap
2. Vectorize storage — moderate; 768 dims default
3. **LLM inference with retrieved context** — dominates

Smaller chunks ↑ precision ↓ context; may ↑ chunks retrieved ↑ inference cost.

---

## AI Search vs custom RAG

| Choose AI Search | Choose custom RAG |
|----------------|-------------------|
| Prototype in hours | Custom chunking per doc type |
| PDF/MD/HTML corpus | Hybrid search control beyond AI Search flags |
| <100k files, standard needs | >10M vectors / complex filters |
| Hybrid + metadata boosting built-in | Unsupported formats |

AI Search: `ai_search_namespaces` for per-tenant instances; MCP endpoint for agents.

---

## Chunking (quality lever)

Default start: **semantic chunks 300–500 tokens, 10–15% overlap**.

| Doc type | Strategy |
|----------|----------|
| API docs | Section/endpoint boundaries |
| Legal | Clause-level, 500–800 tokens |
| Support tickets | 200–300 tokens |
| Mixed corpus | Route by doc type |

---

## Vectorize

- **10M vectors/index** (paid) — multi-index routing beyond
- **768 dims** (`bge-base-en-v1.5`) default; never mix embedding models
- **Namespaces** for tenant isolation within index
- Store **chunk text in metadata** (≤10 KB) — vectors alone insufficient

Low-confidence threshold (~0.8 start): return "can't find" vs confident wrong answer.

---

## Failure modes

| Mode | Signal |
|------|--------|
| Bad retrieval | Confident cited wrong answer |
| Context overflow | Irrelevant chunks dilute prompt |
| Generation ignore | Good context, hallucinated anyway |
| Staleness | Trusted outdated citations |

Monitor: top-k scores, user feedback, sample human eval.

---

## When RAG is wrong

- Corpus fits in context window → inject whole doc
- Real-time data → DB/API/tools, not vectors
- Exact lookups (order #) → SQL
- High-stakes precision → human review, not similarity scores

---

## BrewHub

- Shop docs / SOPs: AI Search or Vectorize + edge retrieval; sensitive ops data stays fleet-bound
- Staff agents: RAG as one tool among many (Ch.18); Postgres for authoritative state
- Don't RAG payment rules without human review path

---

## Promoted anti-patterns

- Retrieve "just in case" max chunks
- Mix embedding models without reindex
- Trust similarity score as accuracy %
- Skip low-confidence handling
- RAG for data that needs live Postgres queries
