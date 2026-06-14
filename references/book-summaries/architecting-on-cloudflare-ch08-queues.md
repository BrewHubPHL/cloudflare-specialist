# Chapter 8: Queues — Asynchronous Processing

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-08) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/queues-cron.md`, `patterns/r2-object-storage.md` (event→queue), `anti-patterns.md`

---

## One-line thesis

Queues are **time-shifted function calls** with at-least-once delivery — simple async decoupling, not orchestration; idempotent consumers are mandatory from day one.

---

## Mental model

| Primitive | Answers |
|-----------|---------|
| **Queues** | "Do this later" — independent tasks, fire-and-forget OK |
| **Workflows** | "Do these steps in order" — dependencies, compensation, visibility |
| **Durable Objects** | "Coordinate this now" — real-time consistency, rate limits, presence |
| **`waitUntil()`** | Fire-and-forget with no retry — failure acceptable |

Warning signs you've outgrown queues: status tables, sequence numbers, compensating actions, correlation IDs + state machines → you've rebuilt Workflows badly.

---

## vs SQS / Service Bus

Cloudflare Queues wins on **operational simplicity** (same wrangler deploy, no IAM/visibility-timeout mismatch). Loses on FIFO ordering, exactly-once at queue level, messages >128 KB without R2 indirection, sessions, sophisticated routing.

Hybrid OK: Cloudflare Queues for simple async inside Workers stack; SQS/Service Bus when enterprise messaging features are required.

---

## Delivery guarantees

- **At-least-once** — only honest distributed guarantee; redelivery on crash, timeout, or ack-before-crash
- **No ordering** — serialisation kills throughput; use Workflows, DO per entity, or accept disorder
- **Idempotency required** — check-then-act, natural idempotency (set/replace), ack only after success

```typescript
const sent = await env.DB.prepare(
  "SELECT 1 FROM sent_emails WHERE message_id = ?"
).bind(task.messageId).first();
if (!sent) {
  await sendEmail(task);
  await env.DB.prepare("INSERT INTO sent_emails (message_id) VALUES (?)")
    .bind(task.messageId).run();
}
message.ack();
```

Non-idempotent ops: emails, charges, counter increments, append-only logs.

---

## Producers

- `send()` up to **128 KB** JSON — larger payloads → R2 + reference in message
- Batch up to 100 msgs / 256 KB — batch failure semantics need explicit retry policy
- Schema evolution: additive-only; version breaking changes explicitly
- Delay up to **12 hours** — longer → Workflows `step.sleep()`
- Queue unavailable: retry with backoff; critical messages → D1 fallback buffer

---

## Consumer profiles

| Profile | batch / timeout / concurrency | Use case |
|---------|------------------------------|----------|
| High-throughput | 100 / 30s / 20 | Analytics, logs, bulk sync |
| Low-latency | 5 / 1s / 10 | Password reset, webhooks, user waiting |
| Unreliable downstream | 10 / 10s / retries 10 / conc 5 | Rate-limited APIs, legacy |

Distinguish transient (429, timeout) vs permanent (400, validation) — ack permanent failures after logging.

**Per-message ack** essential for non-idempotent ETL — batch ack retries successful records.

---

## Pull consumers

HTTP pull when processor **cannot be a Worker** (K8s, Go binary, migration bridge). Sacrifices auto-scaling, platform retry orchestration, binding auth. Default push.

---

## DLQ & failure modes

- `dead_letter_queue` — monitor depth; growing DLQ = active incident
- **Poison message** — per-message ack + permanent-failure ack; batch ack traps healthy msgs
- **Partial batch** — per-message ack + idempotency
- **Head-of-line blocking** — separate slow-type queue or smaller batches
- **Backlog runaway** — alert on sustained growth, not just outage spikes

---

## Monitoring

Backlog depth, consumer error rate, processing latency (send→ack), DLQ inflow. Dashboard + own structured logs (type, duration, failure reason, retry count).

---

## Limits & cost (verify at deploy time)

- ~5k msg/s per queue — shard if needed
- Consumer wall **15 min**; CPU default 30s (extendable on paid)
- Paid: ops = write + read + delete per message; retries add reads
- Batching reduces **Worker invocations**, not queue ops
- Free tier: 10k ops/day; **24h retention** vs 14d paid

---

## BrewHub notes

- R2 upload event → Queue → thumbnail/embed (links `r2-object-storage.md`)
- **Not** for exactly-once payment semantics — Postgres SSOT + advisory locks
- Pull consumer valid for fleet Python workers during hybrid migration
- Idempotent consumers mandatory for webhook fan-out, email, audit exports

---

## Key quotes

> "Queues are promises to do something later."

> "Exactly-once delivery is a distributed systems myth."

> "Don't build elaborate schemes to preserve ordering atop an unordered queue."
