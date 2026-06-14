# Chapter 7: Workflows — Durable Execution

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-07) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/workflows.md`, `patterns/queues-cron.md`, `patterns/agents-sdk.md`, `anti-patterns.md`

---

## One-line thesis

Workflows **checkpoint** multi-step processes — each successful step persists once; resume from last step, not from the beginning. Pay orchestration overhead only when failure mid-process is expensive.

---

## Durable vs retry

| | Retry | Durable (Workflows) |
|---|-------|---------------------|
| On failure | Re-run entire operation | Resume at last completed step |
| State | None | Checkpointed per step |

Each instance = SQLite-backed **Durable Object** with orchestration layered on. Cannot access underlying DO directly — use DO primitive for WebSockets, live state queries, custom storage.

2026 scale (verify current docs): ~50k concurrent instances/account, ~300 instances/s creation, ~2M queue depth per workflow.

---

## When Workflows vs Queues vs DO

| Use Workflows when | Use Queues when | Use DO directly when |
|--------------------|-----------------|----------------------|
| Steps depend on each other | Tasks independent | Real-time state / WebSocket |
| Need progress visibility | Fire-and-forget OK | Logic doesn't map to linear steps |
| Hours/days/weeks duration | Order doesn't matter | Custom storage beyond step results |
| Compensation on partial failure | Parallel idempotent fan-out | Clients query current state |

**Combine:** Workflow orchestrates; Queue fans out parallel work inside a step.

**AgentWorkflow** (Ch.18): agent decides + converses; Workflow executes durably.

---

## Cost of durability

50-step workflow ≈ 50 checkpoints — orchestration $ adds up. Justified when partial failure is expensive (payment captured, inventory not reserved). Independent image processing → Queue + idempotent consumer is simpler and cheaper.

---

## Constraints

| Limit | Implication |
|-------|-------------|
| **1 MiB per step result** (JSON) | Store blobs in R2/D1; pass references |
| **`step.do()` ReadableStream** | Platform persists stream to R2; later steps get stream ref |
| **128 MB runtime memory** | Stream/chunk large files; don't buffer 500 MB in step |
| **Determinism / replay** | Random, timestamps, external reads → wrap in `step.do()` |
| **Step names deterministic** | No timestamps in names — replay matching breaks |

---

## Step types

- **`step.do()`** — execute, persist result; one side effect per step (isolate writes)
- **`step.sleep()` / `sleepUntil()`** — hibernate at **zero marginal cost** during wait
- **`step.waitForEvent()`** — human approval, webhooks; **always set timeout**

Parallel: `Promise.all([step.do(...), ...])`.  
**Promise.race:** wrap entire race in outer `step.do()` — cached step results break naive race on replay.

---

## Idempotency & sagas

Steps may retry before success persists — external APIs need idempotency keys (deterministic from instance ID + step name).

**Saga:** compensating steps in catch block; compensation needs its own retry + human fallback. Defer customer notifications until prior steps confirmed.

**NonRetryableError** for permanent failures (validation, insufficient funds).

**Silent success:** verify outcomes (amount matches order total) — green checkmarks ≠ correct business state.

---

## Versioning & deploy

Running instances keep persisted step results; new code runs for **future** steps only.

| Change | Running instances |
|--------|-------------------|
| Bug fix in step logic | Applies when instance reaches that step |
| New steps at end | Old instances skip them |
| Remove/rename/reorder steps | **Breaks** — new workflow type + drainage |

Service bindings called by workflows: **backward compatible** as long as sleeping instances exist (30-day workflow = 30-day API contract).

Deploy during active `step.do()` may cause transient retry — sleeping/waiting workflows unaffected.

---

## Failure playbook

| Stuck mode | Fix |
|------------|-----|
| Poison step loop | `NonRetryableError` for permanent failures |
| Event starvation | Timeout + escalation on `waitForEvent` |
| Compensation cascade | More reliable compensation + manual fallback |
| State size overflow | R2 references, not payloads in steps |

Logs batch until instance completes — use dashboard step visibility for in-flight debugging.

---

## Patterns

- **Order fulfilment** — sequential + `waitForEvent` for warehouse/carrier
- **Approval chains** — sleep + escalate + auto-reject on timeout
- **Chunked batch** — 1k–10k records per step; resume at failed chunk

---

## Dynamic Workflows (`@cloudflare/dynamic-workflows`)

Tenant-supplied **step definitions** (SaaS automations, agent-generated plans) — code loaded via Worker Loader on wake. Use only when steps differ per tenant, not just parameters. Young API — verify limits.

---

## BrewHub notes

- Order/payment flows: Workflow for capture → reserve → notify; Postgres SSOT via Hyperdrive in steps with idempotency keys
- Not for 10k independent webhook retries — Queue
- Staff approval workflows: `waitForEvent` + Access identity in event payload
- Bindings to fleet APIs must stay backward compatible during long-running instances

---

## Key quotes

> "Checkpoint cost is negligible compared to recovery cost."

> "One step per side effect. Bundle reads freely; isolate writes ruthlessly."

> "If you're fighting Workflows' step model, you probably want a Durable Object."
