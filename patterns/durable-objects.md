# Durable Objects

**Impact:** MEDIUM–HIGH  
**Tags:** durable-objects, websockets, coordination

Use when you need **strong consistency**, single-writer coordination, or WebSocket hibernation at the edge.

## wrangler binding

```jsonc
{
  "durable_objects": {
    "bindings": [{ "name": "CHAT_ROOM", "class_name": "ChatRoom" }]
  },
  "migrations": [{ "tag": "v1", "new_classes": ["ChatRoom"] }]
}
```

**Migrations are mandatory** when adding/changing DO classes.

## Addressing

```typescript
const id = env.CHAT_ROOM.idFromName(`room:${roomId}`);
const stub = env.CHAT_ROOM.get(id);
return stub.fetch(request);
```

## When to use vs KV/Postgres

| Use DO | Use Postgres |
|--------|--------------|
| WebSocket rooms | Orders, payments |
| Per-tenant rate limit counters (edge) | RLS-protected customer data |
| OpenNext tag cache shards | SSOT business tables |

## OpenNext cache DOs

OpenNext on Cloudflare may use Durable Objects for tag cache / incremental cache — configure via `open-next.config.ts`. Hand off to `nextjs-specialist` + OpenNext caching docs.

## References

- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [DO migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
