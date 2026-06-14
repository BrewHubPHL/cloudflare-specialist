# Workflows

**Impact:** HIGH  
**Tags:** workflows, durable-execution, saga, orchestration  
**Book:** Ch.7 — `references/book-summaries/architecting-on-cloudflare-ch07-workflows.md`

## Choose the primitive

| Need | Use |
|------|-----|
| Independent async tasks, at-least-once | **Queues** — `queues-cron.md` |
| Real-time coordination, WebSockets | **Durable Objects** — `durable-objects.md` |
| Multi-step dependent process, visibility, compensation | **Workflows** |
| Agent decides; system executes reliably | **AgentWorkflow** — `agents-sdk.md` |

Workflows earn their cost when **failure mid-process is expensive**. Ten thousand independent jobs → Queue.

---

## Mental model

Each instance = orchestration on a **SQLite-backed Durable Object**. After each successful step, result persists; on failure, resume at next step — not from step 1.

Exactly-once **successful** step execution: retries may run code multiple times, but only one success persists. **Commit point** = step return.

You cannot access the underlying DO — use DO directly when you need live state queries or WebSockets without step abstraction.

---

## wrangler skeleton

```jsonc
{
  "workflows": [{
    "name": "order-fulfilment",
    "binding": "ORDER_WORKFLOW",
    "class_name": "OrderWorkflow"
  }]
}
```

```typescript
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

export class OrderWorkflow extends WorkflowEntrypoint<Env, OrderInput> {
  async run(event: WorkflowEvent<OrderInput>, step: WorkflowStep) {
    const order = event.payload;

    const payment = await step.do("capture-payment", async () => {
      return await capturePayment(order, this.env, `${event.instanceId}:capture-payment`);
    });

    await step.do("reserve-inventory", async () => {
      return await reserveInventory(order, this.env);
    });

    const approval = await step.waitForEvent<{ approved: boolean }>("manager-approval", {
      type: "approval-decision",
      timeout: "48 hours",
    });

    if (!approval.payload.approved) {
      await step.do("refund-payment", async () => {
        return await refund(payment.id, this.env, `${event.instanceId}:refund`);
      });
      return;
    }

    await step.do("notify-customer", async () => {
      return await sendConfirmation(order, this.env, `${event.instanceId}:notify`);
    });
  }
}
```

Trigger from Worker:

```typescript
await env.ORDER_WORKFLOW.create({ id: orderId, params: order });
```

---

## Step types

| Type | Use |
|------|-----|
| `step.do()` | Side effects + persistence |
| `step.sleep()` / `sleepUntil()` | Delays at zero cost while hibernating |
| `step.waitForEvent()` | Human approval, webhooks — **always timeout** |

Send event to waiting workflow via HTTP API or from another Worker.

---

## Design rules

### One side effect per step

Bundle reads; **isolate writes** (charge, send email, reserve inventory). Multiple API calls in one step → all retry if last fails.

### 1 MiB step results

Return references, not payloads:

```typescript
await step.do("process-export", async () => {
  const key = `exports/${instanceId}.csv`;
  await env.BUCKET.put(key, csvStream);
  return { r2Key: key };
});
```

`step.do()` can return `ReadableStream` — platform persists to R2 automatically (verify current docs).

### 128 MB runtime memory

Stream through R2; chunk large jobs across steps (1k–10k records per step).

### Determinism

Wrap in steps: `Date.now()`, `Math.random()`, external reads used for control flow.

Step names must be **stable** — no dynamic names (replay matching).

### Parallel steps

```typescript
const [user, orders] = await Promise.all([
  step.do("fetch-user", () => fetchUser(id)),
  step.do("fetch-orders", () => fetchOrders(id)),
]);
```

Wrap `Promise.race` in outer `step.do()` — inner cached steps break naive race on replay.

---

## Idempotency & sagas

Every external write needs idempotency key — derive from `instanceId + stepName`.

```typescript
import { NonRetryableError } from "cloudflare:workers";

if (!validation.valid) {
  throw new NonRetryableError(validation.reason);
}
```

**Saga:** on failure after partial success, run compensating steps in `catch`. Compensation must retry; human fallback if compensation fails. **Defer customer emails** until prior steps confirmed.

Verify outcomes — payment amount matches order total; don't trust green dashboard alone.

---

## Workflows + Queues

Fan-out inside a step:

```typescript
await step.do("enqueue-notifications", async () => {
  await Promise.all(users.map(u => env.NOTIFY_QUEUE.send({ userId: u.id, ... })));
  return { enqueued: users.length };
});
```

Workflow waits for completion via polling, `waitForEvent`, or separate completion step — design explicitly.

---

## Versioning & deploy

| Change | Action |
|--------|--------|
| Logic fix in existing step | Deploy in place |
| New steps at end | OK; old instances skip |
| Rename/remove/reorder steps | **New workflow class** + drain old |
| Breaking step I/O | New workflow class |

Service bindings invoked from workflows: treat as **versioned API** — sleeping instances may call 30 days later.

Active `step.do()` during deploy may retry once — sleeping/waiting unaffected.

Workflow logs flush at instance end — use dashboard step view for in-flight debugging.

---

## Testing

`vitest-pool-workers` + `introspectWorkflow` / `introspectWorkflowInstance`: mock step results, `disableSleeps()`, `mockEvent()`. Test **your business logic**, not platform checkpoint machinery.

---

## Production notes

- Payment capture → inventory → notification: Workflow with Postgres idempotency via Hyperdrive
- Long approval chains: `waitForEvent` + timeout escalation
- Do **not** replace Postgres job queue for money semantics — Workflow coordinates; SSOT stays fleet Postgres
- Workflow steps calling fleet APIs: same HMAC/service token patterns as Workers

---

## References

- [Workflows](https://developers.cloudflare.com/workflows/)
- [Queues comparison](queues-cron.md)
- [Dynamic Workflows](https://developers.cloudflare.com/workflows/dynamic-workflows/) — tenant-supplied definitions (verify GA status)
