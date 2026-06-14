# Queues & Cron

**Impact:** MEDIUM  
**Tags:** queues, cron, background

## Queue consumer

```jsonc
{
  "queues": {
    "consumers": [{
      "queue": "ai-jobs",
      "max_batch_size": 10,
      "max_batch_timeout": 30,
      "max_retries": 5,
      "dead_letter_queue": "ai-jobs-dlq"
    }],
    "producers": [{ "queue": "ai-jobs", "binding": "AI_QUEUE" }]
  }
}
```

```typescript
export default {
  async queue(batch: MessageBatch<JobPayload>, env: Env) {
    for (const msg of batch.messages) {
      try {
        await processJob(msg.body);
        msg.ack();
      } catch (err) {
        msg.retry();
      }
    }
  },
};
```

**Idempotent consumers** — retries are guaranteed.

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

Cron is not a substitute for Postgres-backed job queues when exactly-once money semantics matter — use DB locks + advisory patterns from `supabase-specialist`.

## References

- [Queues](https://developers.cloudflare.com/queues/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
