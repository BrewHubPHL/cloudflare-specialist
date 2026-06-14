# Durable Objects

**Impact:** MEDIUM–HIGH  
**Tags:** durable-objects, websockets, coordination, sqlite, rpc  
**Source:** *Architecting on Cloudflare* Ch.6 — [book summary](../references/book-summaries/architecting-on-cloudflare-ch06-durable-objects.md)

Globally-unique, **single-threaded actors** — coordination primitive first, SQLite storage second. Not servers to provision; **one object per logical entity**.

---

## Decision: DO vs D1 vs KV vs Postgres

**Do concurrent requests to this entity need immediate shared effects?**

| Use | Primitive |
|-----|-----------|
| Config, flags, cache (stale OK ~60s) | KV |
| Relational queries, no cross-request coordination | D1 or Hyperdrive → Postgres |
| Carts, rate limits, WebSockets, real-time collab | **Durable Objects** |
| Money, RLS, cross-tenant reports | **Postgres SSOT** (your fleet Postgres) |

If you're minimising DO count for cost, you're modelling wrong — shift to **one DO per user/room/document**.

---

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

---

## Addressing & routing

```typescript
const id = env.CHAT_ROOM.idFromName(`room:${roomId}`);
const stub = env.CHAT_ROOM.get(id);
return stub.fetch(request);
```

All operations on one entity → one object. Rate limits, leader election, sessions: same pattern, different entity name.

---

## RPC (preferred)

Requires recent `compatibility_date` (≥ 2024-04-03). Typed methods on the DO class:

```typescript
// ChatRoom DO
async postMessage(userId: string, text: string): Promise<void> {
  this.ctx.storage.sql.exec(
    "INSERT INTO messages (user_id, body, created_at) VALUES (?, ?, ?)",
    userId, text, Date.now()
  );
}

// Worker
const stub = env.CHAT_ROOM.get(id);
await stub.postMessage(userId, text); // always await
```

Use `fetch()` when proxying full HTTP or migrating legacy handlers incrementally.

---

## SQLite storage

```typescript
this.ctx.storage.sql.exec(
  "SELECT name, score FROM players ORDER BY score DESC LIMIT 10"
).toArray();
```

| Limit | Value |
|-------|-------|
| DB per DO | 10 GB |
| Row | 2 MB — large blobs → R2 + reference |
| WebSockets | 32,768 / object |

### Eviction (~10s idle)

Class fields **may reset**. Persist authoritative state in SQLite; in-memory only for acceptable-loss caches (write-through counters).

### Output gating

Response from DO ⇒ write is durable. Don't `await` non-storage work between related SQL writes — breaks write coalescing. Complete read-modify-write synchronously, then persist.

---

## Throughput & sharding

~**1,000 RPS ceiling per DO** (single-threaded). **God object anti-pattern:** one DO for all users → serialisation bottleneck.

Fix: `idFromName(userId)` per rate-limited entity, not one global counter DO.

If truly hot: client batching, KV read replicas (stale), or shard counters — each adds complexity; reconsider entity model first.

---

## Control plane / data plane

- **Registry DO:** create/list workspaces, projects, rooms (admin path)
- **Per-resource DO:** hot path routes directly — registry not in request path

---

## WebSockets + hibernation

Use for many **idle** connections (>~10k economic benefit):

```typescript
// Accept with hibernation API — not manual WebSocketPair only
this.ctx.acceptWebSocket(server);
```

- Incoming client WS: hibernates when idle
- Outgoing WS to external services: **no hibernation**
- **Every deploy closes all WS** — clients must reconnect and rehydrate

Connection metadata: `serializeAttachment()` (≤2 KB).

---

## Placement

First access places object near that request. CI creating all objects from one region → wrong geography for global users.

Use location hints when optimal region known. Jurisdictional restrictions for compliance workloads.

---

## Alarms vs Cron

| Trigger | Use |
|---------|-----|
| **Alarm** | Per-object schedule (user subscription renews on unique date) |
| **Cron Trigger** | Global schedule (nightly cleanup) |

Alarms: at-least-once — handlers must be idempotent.

---

## OpenNext cache DOs

OpenNext on Cloudflare may use DOs for tag cache / incremental cache — configure via `open-next.config.ts`. Hand off to `nextjs-specialist`.

---

## Production notes

- DO for edge coordination (presence, edge rate limits) — OK
- Payment/inventory authority → Postgres via Hyperdrive, not DO SQLite alone
- Highest lock-in tier — accept only when coordination value is clear

---

## References

- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [DO migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [RPC](https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-rpc/)
- [Agents SDK](agents-sdk.md) — one DO per user agent
- [Realtime WebRTC](realtime-webrtc.md) — DO for data; Realtime for A/V
