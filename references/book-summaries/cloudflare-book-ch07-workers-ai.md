---
source: "Cloudflare for Speed and Security (Kerkour) — Ch 7: Workers AI"
topics: [embeddings, fine-tuning, vectorize, rag, llm]
priority: medium
added: 2026-06-14
---

## Summary

Short conceptual chapter on LLM specialization: **embeddings over fine-tuning** for live apps — fine-tune is slow, expensive, and impractical on every data update; re-embedding documents is cheap. Embeddings give LLMs "memory" via retrieval (chunk → vector → similarity search → small context to LLM). Vector DB options: pgvector, Milvus, Pinecone, **Cloudflare Vectorize**. Chapter truncated in PDF before Neon/pgvector walkthrough.

## One-line thesis

**Embed and retrieve** — don't fine-tune on every content change; update vectors when documents change.

## Actionable rules

1. **Default:** RAG with embeddings for domain knowledge — not fine-tuning per deploy.
2. **Fine-tuning** when: stable domain, specialized datasets, budget for GPU runs — not for FAQ doc updates.
3. Split large documents — embedding models have input limits → many vectors per doc.
4. Vector DB when: similarity search at scale beyond brute-force pgvector without index.
5. **Vectorize** for CF-native RAG; **pgvector on Postgres** when SSOT already on fleet (BrewHub path via Hyperdrive).
6. Pair with Workers AI + AI Gateway for inference — see Lord Ch.15–16 for production patterns.

## BrewHub notes

- Fleet Postgres + pgvector for shop/docs RAG SSOT; Vectorize optional for edge-only retrieval.
- Heavy reasoning stays Python agents via Tunnel — Workers AI for classify/route/extract at edge.
- Re-embed on document change via Queue — idempotent handlers.

## Cross-links

- `patterns/ai-stack.md`
- `patterns/workers-ai.md`
- `patterns/rag-vectorize.md`

## Key quotes

> "Today, it's not realistic to fine-tune a model each time you update your data."

> "Creating new embeddings each time a new document is updated is rather cheap."
