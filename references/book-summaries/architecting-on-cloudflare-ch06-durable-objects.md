# Chapter 6: Durable Objects — Stateful Compute at the Edge

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-06) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/durable-objects.md`, `anti-patterns.md`

---

## One-line thesis

Durable Objects are **globally-unique, single-threaded actors** — coordination primitive first, storage second. Think **one object per logical entity**, not servers to provision.

---

## Mental model shift

| Wrong | Right |
|-------|-------|
| "How many DOs can I afford?" | "One DO per user / room / document / session" |
| Shared Redis + locks | Single-threaded actor — atomicity by execution model |
| Servers you scale vertically | Database rows that run code — millions is normal |

**Active object:** encapsulates state + thread. Passive DB rows need external threads; DOs process messages on their own thread.

---

## Decision framework

**Ask:** Do concurrent requests to this entity need to see each other's effects immediately?

| Need | Use |
|------|-----|
| Read-heavy, stale OK (60s) | KV |
| Relational queries, no cross-request coordination | D1 |
| Coordination, strong RYW, WebSockets, real-time | **Durable Objects** |

Examples: user profile (stale OK) → D1; shopping cart across tabs → DO; rate limiter → DO; product catalogue → D1 + KV cache.

---

## Communication

### RPC (preferred, compat ≥ 2024-04-03)

```typescript
// DO class
async getProfile(): Promise<Profile | null> { /* ... */ }

// Worker
const stub = env.USER_PROFILE.get(id);
const profile = await stub.getProfile();
```

**Always await RPC** — unawaited calls swallow errors.

### fetch() when

- Proxying full HTTP semantics
- Incremental migration from fetch-based DOs

---

## Storage (SQLite in DO)

```typescript
this.ctx.storage.sql.exec(
  "INSERT INTO moves (player_id, move_data) VALUES (?, ?)",
  playerId, JSON.stringify(moveData)
);
```

| Limit | Value |
|-------|-------|
| SQLite per DO | 10 GB |
| Row size | 2 MB (chunk large docs → R2) |
| WebSocket connections | 32,768 / object |

### Eviction (~10s idle)

- **SQLite:** survives eviction
- **In-memory class fields:** may vanish — bugs that pass in dev, fail in prod
- Pattern: write-through hot counters; session data in SQLite

### Output gating (critical guarantee)

If you received a response from a DO, the write is **durable**. External effects (response, fetch, WebSocket) wait until replication (~2–10 ms).

- Linearisability by default — no read-your-writes hacks
- **Input gates:** sync code blocks interleaving; don't `await` mid read-modify-write
- **Write coalescing:** multiple `sql.exec` without non-storage `await` → one atomic txn

---

## The one pattern

```typescript
const id = env.USER.idFromName(userId);
const stub = env.USER.get(id);
return stub.fetch(request); // or RPC
```

Applied to: rate limits, leader election, chat rooms, collaborative docs — same routing, different entity.

### Control plane / data plane

- **Registry DO:** create/list resources (admin path)
- **Per-resource DO:** hot path bypasses registry

### Throughput ceiling

~**1,000 RPS per DO** (single-threaded). Fix: shard entity (one DO per user, not one DO for all users — **god object anti-pattern**).

---

## Placement

- First access creates object **near that request** — misaligns if CI provisions all DBs from us-east-1
- Cross-continent: +50–150 ms per call
- **Location hints** when optimal region known upfront
- **Jurisdictional restrictions** for compliance (GDPR) — storage + compute in region

---

## WebSockets + hibernation

- **Hibernation:** idle WS connections without burning compute — matters >~10k idle connections
- Requires `ctx.acceptWebSocket()` + `webSocketMessage`/`webSocketClose` handlers
- **Outgoing WS to external services** — cannot hibernate
- **Deploy resets all WS** — client reconnect + rehydrate mandatory

Metadata: `serializeAttachment()` (≤2 KB per connection).

---

## Lifecycle

- Constructor runs on every wake — use `blockConcurrencyWhile()` for migrations (don't overuse)
- **Alarms:** per-object scheduled wake (subscription renewals); **Cron Triggers** for global schedules
- Alarms: at-least-once, idempotent handlers, up to ~1 min drift under load

---

## vs Redis / hyperscaler

| | DO | Redis |
|---|-----|-------|
| Atomicity | Single-threaded | Lua/WATCH/MULTI |
| Portability | Cloudflare-only | Anywhere |
| Ops | Managed | Pools, failover |

vs AWS: API GW + Lambda + DynamoDB + ElastiCache → often one DO for presence/chat.

**Highest lock-in tier** — accept when coordination value is irreplaceable.

---

## Failure modes (name them)

- Placement latency mismatch (London-created session, Tokyo players)
- Hibernation cold start (+50–100 ms first message)
- Alarm drift
- State eviction surprise (in-memory only)
- **God object:** one DO for all users → serialisation bottleneck at ~1k RPS

---

## BrewHub notes

- Edge coordination (rate limits, session fan-out) → DO OK
- **Payment / inventory SSOT** → fleet Postgres, not DO SQLite alone
- Staff agent state: prefer Postgres + Tunnel; DO for real-time UI coordination only if needed
- OpenNext tag cache DOs — platform-managed pattern

---

## Promoted anti-patterns

- One DO for all tenants/users (god object)
- Implicit in-memory state without eviction decision
- Unawaited RPC
- `await` between related SQL writes + external fetch (breaks coalescing)
- Expecting WAF on same-zone internal DO calls without Worker-side checks
- WebSocket apps without reconnect-on-deploy
