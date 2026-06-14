# Chapter 18: AI Agents and Advanced Patterns

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-18) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/agents-sdk.md`, `patterns/durable-objects.md`, `patterns/workers-ai.md`, `anti-patterns.md`

---

## One-line thesis

Agents take **actions**, not just answers — production agents are ruthlessly **constrained** (tools = attack surface); DO per user gives single-threaded tool execution and hibernation economics.

---

## When agents vs simpler patterns

| Need | Use |
|------|-----|
| Q&A from docs | RAG (`rag-vectorize.md`) |
| Known step sequence | Workflows |
| Human can approve each action | Explicit approval UI, not full agent |
| Autonomous multi-step tool use, unpredictable path | Agents SDK |

All three required for agent architecture: (1) genuine tool use modifying state, (2) sequence not predetermined, (3) human-in-loop latency unacceptable.

Heuristic: start with workflows you spend 30+ min/week on — clear success criteria, low-stakes failure modes.

---

## Why Durable Objects

- State co-located with compute across conversation turns
- **Single-threaded** — no double-charge / double-book race on tool execution
- `idFromName(userId)` — one agent per customer, no sharding logic
- **Hibernation** — idle conversation costs nothing
- `validateStateChange()` — reject invalid transitions at boundary

---

## Hidden cost of `this.chat()`

One user message → many LLM round-trips (tool consider → execute → follow-up → repeat). Budget: calls × tokens × users. Show progress; stream partial results.

Build custom orchestration when you need fine-grained cost/latency control — SDK is convenience, not only path.

---

## Tool design = system design

Descriptions drive behaviour more than implementation. Include when to use **and when not to**. Zod/enum constraints on parameters. Test that **LLM uses tools correctly**, not just that handlers work.

---

## Failure modes (normal in production)

| Failure | Mitigation |
|---------|------------|
| Hallucinated tool names | Validate against defined tools before execute |
| Bad parameter extraction | Schema validation; format examples in descriptions |
| Infinite tool loops | Same tool+params >2× → fail explicitly |
| Context overflow | Summarise/prune; Agent Memory (beta) for cross-session recall |
| Prompt injection via tool output | Treat outputs as untrusted; structured data over raw user content |

Dangerous combo: private data + untrusted content + exfiltration capability (email assistant pattern).

---

## MCP

- **Build server** when multi-app reuse, ecosystem exposure
- **Consume existing** when maintained (e.g. GitHub MCP)
- **Direct tools** for single-purpose agents

**Remote MCP on Cloudflare:** `McpAgent` DO — OAuth 2.1; server issues **own tokens**, not upstream passthrough (OWASP Excessive Agency mitigation). Access Managed OAuth for internal apps.

Permission-based tool registration: admin tools literally don't exist for non-admin — defence through absence.

---

## Sandboxing

| Approach | When |
|----------|------|
| **Dynamic Workers** (`LOADER.load`) | Default agent sandbox — JS/TS/WASM; `globalOutbound: null`; RPC-only env |
| **Code Mode** (`@cloudflare/codemode`) | Large tool surface — agent writes one function, 81% token savings possible |
| **Sandbox SDK** | Python + matplotlib/pandas rich output; container cold start |
| **Containers (Ch.9)** | Full runtime control |

One sandbox per user for isolation. Outbound Workers inject credentials — never hand tokens to LLM-generated code.

---

## Browser Run as tool

REST: `/screenshot`, `/pdf`, `/markdown`, `/scrape`, `/json` (AI extract), `/crawl`. Prefer **Markdown for Agents** (`Accept: text/markdown`) on supported zones before headless browser — ms vs seconds.

Live View for human-in-the-loop (CAPTCHA, login walls). Session recordings for reproducing agent browser failures.

---

## Multi-agent & Workflows

Default: **one agent**. Multi-agent when security boundaries (payment vs research) or genuinely different capabilities.

`AgentWorkflow`: agent decides + converses; Workflow executes durably (payment, inventory, notifications). Real-time feedback via agent WebSocket; predetermined steps in Workflow.

---

## Security layers

1. System prompt constraints  
2. Tool availability (undefined = uncalled)  
3. Tool implementation validation  
4. Permission-based MCP registration  
5. Human-in-the-loop for sensitive actions  
6. Rate limits, cost caps, action trace logging, kill switches  

---

## Production notes

- Edge: classification, routing, Access, RAG over public docs — Workers AI + Gateway
- Fleet: heavy reasoning, app-specific tools — Python agents via Tunnel + HMAC
- Staff agent: narrow tools (inventory lookup, ticket create) — not payment or account mutation without Postgres workflow
- MCP for internal ops tools behind Access Managed OAuth
- Cost monitoring from day one — agent loops burn tokens fast

---

## Key quotes

> "The hardest problem in agent design isn't the AI; it's defining boundaries."

> "If a tool isn't registered, it doesn't exist."

> "Build cost monitoring from the start with alerts for anomalous usage indicating infinite loops or abuse."
