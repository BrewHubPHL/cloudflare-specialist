# Agents SDK

**Impact:** MEDIUM  
**Tags:** agents, mcp, durable-objects, workers-ai, security  
**Book:** Ch.18 — `references/book-summaries/architecting-on-cloudflare-ch18-agents-sdk.md`

## Default: don't build an agent

| User need | Build |
|-----------|-------|
| Q&A from knowledge base | RAG — `patterns/rag-vectorize.md` |
| Fixed multi-step pipeline | Workflows |
| Human approves each action | Explicit approval UI |
| Autonomous tool use, unpredictable steps | Agents SDK |

Agent when **all three** hold: modifies state via tools, path not predetermined, human-in-loop latency unacceptable.

---

## Architecture: DO per user

Agents SDK builds on Durable Objects — one agent instance per user/session.

```typescript
// wrangler: durable_objects.bindings + migrations
export class SupportAgent extends Agent {
  async onChatMessage(message: string) {
    return this.chat(message); // may trigger many LLM + tool rounds
  }
}
```

Why DO:

- **Single-threaded** — tool executions don't interleave (no double-charge races)
- **Hibernation** — idle conversation costs nothing
- **`idFromName(userId)`** — global routing without sharding logic
- **`validateStateChange()`** — reject invalid state at persistence boundary

Cross-links: `durable-objects.md`, `workers-ai.md`, `workflows.md` (AgentWorkflow).

---

## Edge vs fleet split

```
Edge (Workers)
  ├── Access + classification (Workers AI + Gateway)
  ├── RAG over public docs (Vectorize / AI Search)
  └── Route to fleet when domain tools needed

Fleet (Coolify / Tunnel + HMAC)
  ├── Python agents — brewery ERP, inventory, scheduling
  └── Postgres SSOT via Hyperdrive from edge
```

Edge agents: narrow scope (lookup, ticket create, doc Q&A). **No** payment or account mutation without Postgres-backed Workflow + human approval.

---

## Tool design

Tool descriptions drive LLM behaviour more than handler code.

```typescript
this.server.tool(
  "lookupOrder",
  "Look up order status by order ID. Use when customer asks about a specific order. Do NOT use for product catalog questions.",
  { orderId: z.string().regex(/^ORD-\d{5}$/, "Format: ORD-12345") },
  async ({ orderId }) => { /* ... */ }
);
```

Rules:

- When to use **and when not to**
- Zod/enum constraints — validate before execute
- Test LLM tool **selection**, not just handler correctness
- Static tool definitions — never build from user input

Permission-based registration (MCP): admin tools don't exist for non-admin users.

---

## Failure modes (plan for these)

| Mode | Detection | Mitigation |
|------|-----------|------------|
| Hallucinated tool | Unknown tool name | Validate before execute |
| Bad parameters | Schema fail | Descriptions with format examples |
| Tool loop | Same tool+params >2× | Fail with guidance |
| Context overflow | Token growth | Summarise/prune history |
| Injection via tool output | — | Structured data; sanitise untrusted content |

Log every tool call (params, result, state transition). Kill switch to halt on anomaly.

---

## MCP

| Strategy | When |
|----------|------|
| Build MCP server | Multi-app reuse, expose APIs to agent ecosystem |
| Consume existing | Maintained community/server (don't reimplement) |
| Direct tools | Single-purpose agent, no reuse |

Remote MCP on Cloudflare: `McpAgent` extends DO. OAuth 2.1 — **issue your own tokens**, never passthrough upstream (GitHub/etc.) tokens to clients.

Internal apps behind Access: **Managed OAuth for Access** — RFC 9728 discovery, no separate auth server.

---

## Sandboxing agent-generated code

| Approach | When |
|----------|------|
| **Dynamic Workers** (`LOADER.load`) | Default — JS/TS; `globalOutbound: null`; RPC stubs only in `env` |
| **Code Mode** (`@cloudflare/codemode`) | Large tool surface — one LLM writes chained code |
| **Sandbox SDK** | Python + rich output (charts, DataFrames) |
| **Containers** | Full runtime / system deps — Ch.9 |

One sandbox per user. Outbound Workers inject credentials — never pass API keys into LLM-generated code.

---

## Agents + Workflows

Agent: conversation, LLM reasoning, WebSocket progress.  
Workflow: durable execution of decided steps (payment, inventory, notifications).

```typescript
// Agent decides; Workflow executes durably
const instanceId = await this.runWorkflow("ORDER_FULFILMENT", { orderId, items });
// onWorkflowProgress → broadcast to client
```

Human-in-the-loop: agent manages dialog; Workflow `step.waitForEvent()` tracks approval chain.

---

## Cost & latency

One user message → 5–50 LLM calls. Budget: interactions × calls × tokens. AI Gateway for cache, limits, logging. Smaller models for routing; larger only when eval proves need.

Show progress indicators — agents feel slower than chatbots by design.

---

## Security checklist

- [ ] Constraints list longer than capabilities list
- [ ] Layers: prompt + tool availability + handler validation + MCP permissions
- [ ] Rate limits and cost caps per user
- [ ] Human approval for sensitive actions (delete, payment, external send)
- [ ] No private data + untrusted content + exfiltration in one agent
- [ ] Action trace logging before production

---

## References

- [Agents SDK](https://developers.cloudflare.com/agents/)
- [AI stack overview](ai-stack.md)
- [MCP on Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/)
- [Dynamic Worker Loader](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/)
- [Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
