# Bindings & Storage (KV, R2, D1)

**Impact:** HIGH  
**Tags:** kv, r2, d1, hyperdrive

## Selection matrix

| Product | Consistency | Best for | Avoid for |
|---------|-------------|----------|-----------|
| **KV** | Eventual | Config cache, feature flags, idempotency keys (short TTL) | Financial ledger, inventory SSOT |
| **R2** | Strong per object | Uploads, exports, webhook payload archives | Hot relational queries |
| **D1** | SQL, edge sqlite | Lightweight relational at edge | Heavy Postgres RLS apps (use Hyperdrive) |
| **Hyperdrive** | Pooled Postgres | Worker → existing Supabase/Postgres | Schema migrations (still in Postgres) |

## KV binding

```jsonc
{
  "kv_namespaces": [{ "binding": "CACHE", "id": "<namespace-id>" }]
}
```

```typescript
await env.CACHE.put(`menu:v3`, JSON.stringify(menu), { expirationTtl: 300 });
const cached = await env.CACHE.get(`menu:v3`, 'json');
```

## R2 binding

```jsonc
{
  "r2_buckets": [{ "binding": "AUDIT", "bucket_name": "webhook-audit" }]
}
```

```typescript
await env.AUDIT.put(`events/${id}.json`, body, {
  httpMetadata: { contentType: 'application/json' },
});
```

## Hyperdrive to Postgres

For Workers calling Supabase/Postgres, use **transaction pooler URI** via Hyperdrive — see `supabase-specialist` `connection-pooling.md`.

## Remote bindings in dev

```jsonc
{
  "r2_buckets": [{
    "binding": "AUDIT",
    "bucket_name": "webhook-audit",
    "remote": true
  }]
}
```

Local Worker code hits production R2 — use carefully.

## References

- [KV bindings](https://developers.cloudflare.com/kv/concepts/kv-bindings/)
- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [D1](https://developers.cloudflare.com/d1/)
