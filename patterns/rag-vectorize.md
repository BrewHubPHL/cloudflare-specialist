# RAG & Vectorize

**Impact:** HIGH  
**Tags:** rag, vectorize, ai-search, embeddings  
**Source:** *Architecting on Cloudflare* Ch.17 — extends [workers-ai.md](workers-ai.md)

Retrieval-augmented generation grounds LLMs in your data. **Bad retrieval + citations** is worse than obvious hallucination — design for confidence thresholds and staleness.

---

## Build vs buy

| AI Search (managed) | Custom RAG |
|---------------------|------------|
| Hours to prototype | Full chunking/hybrid control |
| PDF, MD, HTML, CSV | Any parseable format |
| Built-in hybrid (vector + BM25) | D1 FTS5 + Vectorize merge |
| Per-tenant via `ai_search_namespaces` | Vectorize namespaces / multi-index |

Start AI Search; drop to custom when you can name the failure (chunk boundaries, filtering, format).

---

## Cost hierarchy (optimise in order)

1. **LLM inference** (~95% ongoing) — fewer/smarter chunks, smaller model, `max_tokens`
2. Embedding + Vectorize storage
3. One-time indexing

---

## Chunking defaults

- Semantic boundaries, **300–500 tokens**, **10–15% overlap**
- API docs → per endpoint; tickets → 200–300 tokens
- Mixed corpus → classify doc type, route chunker

Store **full chunk text in Vectorize metadata** (≤10 KB) — vectors alone can't build prompts.

---

## Vectorize

```typescript
await env.VECTOR_INDEX.upsert(vectors, { namespace: `tenant-${tenantId}` });

const results = await env.VECTOR_INDEX.query(queryEmbedding, {
  namespace: `tenant-${tenantId}`,
  topK: 5,
});

if (!results.matches.length || results.matches[0].score < 0.8) {
  return 'No relevant information found.';
}
```

| Limit | Implication |
|-------|-------------|
| 10M vectors / index | ~2M docs × 5 chunks — multi-index beyond |
| 1536 max dimensions | Pick model once (`bge-base` 768 default) |
| Never mix embedding models | Reindex entire corpus on change |

---

## Retrieval pipeline

```typescript
const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: query });
const chunks = await vectorSearch(embedding, env);
const answer = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    { role: 'system', content: 'Answer only from provided context. Cite sources.' },
    { role: 'user', content: `Context:\n${formatChunks(chunks)}\n\nQuestion: ${query}` },
  ],
  max_tokens: 512,
  temperature: 0.1,
});
```

Hybrid (custom): Vectorize + D1 FTS5 → merge/dedupe scores.

---

## When NOT to use RAG

- Entire corpus fits context window
- Live Postgres/Supabase data (query SSOT via Hyperdrive)
- Exact ID lookups, computations
- High-stakes answers without human review

---

## Production notes

- Public/help docs: AI Search or Vectorize at edge
- Shop secrets, pricing authority, payment flows: **Postgres SSOT**, not vector index alone
- Staff agents on fleet: RAG as tool; edge handles routing/classification only if data classification allows

---

## References

- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [AI Search](https://developers.cloudflare.com/ai-search/)
- [Ch.17 summary](../references/book-summaries/architecting-on-cloudflare-ch17-rag-vectorize.md)
- [AI stack overview](ai-stack.md)
- [Workers AI](workers-ai.md)
