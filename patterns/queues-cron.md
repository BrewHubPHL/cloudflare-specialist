# Queues & Cron

**Impact:** MEDIUM  
**Tags:** queues, cron, background, async  
**Book:** Ch.8 — `references/book-summaries/architecting-on-cloudflare-ch08-queues.md`

## Choose the primitive

| Need | Use |
|------|-----|
| Independent task, seconds–minutes delay OK | **Queues** |
| Known multi-step order, compensation, visibility | **Workflows** — `workflows.md` |
| Real-time coordination, rate limits, presence | **Durable Objects** |
| Nice-to-have, no retry, failure OK | **`waitUntil()`** |
| Scheduled periodic sweep | **Cron** (not a durable job queue) |

Queues answer "do this later." If you add status tables, sequence numbers, or compensating actions — evaluate Workflows instead.

---

## Queue consumer (push — default)

```jsonc
{
  "queues": {
    "consumers": [{
      "queue": "ai-jobs",
      "max_batch_size": 10,
      "max_batch_timeout": 5,
      "max_retries": 3,
      "dead_letter_queue": "ai-jobs-dlq",
      "max_concurrency": 10
    }],
    "producers": [{ "queue": "ai-jobs", "binding": "AI_QUEUE" }]
  }
}
```

### Consumer profiles

| Profile | Settings | When |
|---------|----------|------|
| Throughput | batch 100, timeout 30s, conc 20 | Logs, analytics, bulk sync |
| Low latency | batch 5, timeout 1s | User waiting (email, webhook) |
| Flaky downstream | retries 10, conc 5 | Rate-limited external APIs |

Batch size does **not** reduce queue ops (still per-message read/write/delete) — it reduces **Worker invocations**.

---

## Idempotent consumers (mandatory)

At-least-once delivery — redelivery on crash, timeout, or ack-before-crash. Design from day one.

```typescript
export default {
  async queue(batch: MessageBatch<JobPayload>, env: Env) {
    for (const message of batch.messages) {
      try {
        const done = await env.DB.prepare(
          "SELECT 1 FROM processed_jobs WHERE id = ?"
        ).bind(message.body.jobId).first();

        if (!done) {
          await processJob(message.body, env);
          await env.DB.prepare(
            "INSERT INTO processed_jobs (id) VALUES (?)"
          ).bind(message.body.jobId).run();
        }
        message.ack(); // only after success
      } catch (error) {
        if (isTransient(error)) {
          message.retry({ delaySeconds: 60 });
        } else {
          await logPermanentFailure(message.body, error, env);
          message.ack(); // stop retrying poison messages
        }
      }
    }
  },
};
```

**Per-message ack** when downstream writes aren't idempotent (ETL to APIs without dedup). Batch-level ack retries successful records.

Non-idempotent by default: email send, payment charge, counter increment, append-only log.

---

## Producers

```typescript
// Small payload — direct send
await env.AI_QUEUE.send({ jobId, userId, action: "embed" });

// Large payload — R2 indirection (128 KB limit per message)
await env.BUCKET.put(key, largeBlob);
await env.AI_QUEUE.send({ jobId, r2Key: key });
```

- Schema evolution: additive fields with defaults; version breaking changes explicitly
- Delay up to 12h — longer delays → Workflows `step.sleep()`
- Critical producer failure: retry with backoff; optional D1 fallback buffer

---

## Dead letter queue

```toml
dead_letter_queue = "ai-jobs-dlq"
```

DLQ is a normal queue with its own consumer (alert, replay, manual review). **Monitor DLQ depth** — growth means active incident, not backlog to ignore.

---

## Pull consumers (hybrid migration)

When the processor **cannot be a Worker** (fleet Python, K8s, legacy Go): HTTP pull API. One queue — push **or** pull, not both.

Use during migration: Workers produce → fleet pulls → later migrate consumer to Worker push.

Sacrifices: auto-scaling, platform `message.retry()`, binding auth (needs API tokens).

---

## R2 → Queue pipeline

R2 event notifications → Queue → consumer (thumbnail, virus scan, Workers AI embed). See `patterns/r2-object-storage.md`.

---

## Failure modes

| Mode | Fix |
|------|-----|
| Poison message loop | Per-message ack; ack permanent failures |
| Partial batch retry | Per-message ack + idempotency |
| Head-of-line blocking | Separate slow queue or smaller batches |
| Backlog runaway | Alert sustained growth; capacity vs production rate |

Essential metrics: backlog depth, error rate, send→ack latency, DLQ inflow.

---

## Limits (verify at deploy time)

- ~128 KB per message; ~5k msg/s per queue (shard if needed)
- Consumer wall **15 min**; CPU default 30s (extendable on paid)
- Free tier: 10k ops/day, **24h** message retention vs 14d paid

---

## Cron trigger

```jsonc
{
  "triggers": { "crons": ["0 */6 * * *"] }
}
```

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runReconcile(env));
  },
};
```

Cron fires on schedule — **not** at-least-once job delivery, not backlog-aware. Use for periodic sweeps (cache warm, reconcile enqueue). For durable async work with retry/DLQ, **enqueue to a Queue** from cron instead of doing heavy work inline.

---

## BrewHub

- **Not** for exactly-once payment semantics — Postgres SSOT + advisory locks (`supabase-specialist`)
- Webhook fan-out, email, R2 post-processing, audit export jobs → Queues with idempotent consumers
- Pull consumer valid for Python agent tier during hybrid phase
- Enqueue from API Worker after Hyperdrive write; consumer can call fleet via Tunnel + HMAC

---

## References

- [Queues](https://developers.cloudflare.com/queues/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Pull consumers API](https://developers.cloudflare.com/queues/reference/pull-consumers/)
