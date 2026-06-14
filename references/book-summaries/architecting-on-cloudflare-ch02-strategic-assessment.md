# Chapter 2: Strategic Assessment

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-02) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/platform-assessment.md`, `anti-patterns.md`, `SKILL.md` (BrewHub Integration)

---

## One-line thesis

Platform adoption is never purely technical — workload fit, economics, team ramp, lock-in tolerance, and organisational momentum determine success as much as binding syntax.

---

## Evaluation heuristic (author + BrewHub alignment)

**Start with Cloudflare and find reasons not to use it** — not the reverse.

Greenfield edge-first apps inherit global deployment, zero cold starts, integrated TLS/DDoS, and binding-native storage without multi-region engineering. Validate hard constraints early before switching costs accumulate.

BrewHub corollary: edge Workers + Access/Tunnel + self-hosted Postgres (Coolify/Hetzner) is the default topology; hyperscaler backends are intentional, not accidental.

---

## Decision in brief

| Path | Choose when |
|------|-------------|
| **Cloudflare** | Global users, latency-sensitive auth/API, I/O-heavy orchestration, real-time coordination (DO), egress-heavy object serving (R2), operational simplicity over max flexibility |
| **Hyperscaler** | Specific managed services (SageMaker, BigQuery), compute-bound workloads, deep existing expertise + tight deadline, regulatory cloud mandate, active reserved capacity |
| **Hybrid** | Incremental migration, mixed workload profiles, risk tolerance needs rollback — **often optimal**, not a compromise |

---

## Fundamental platform constraints (binary filters)

| Constraint | Threshold | If exceeded |
|------------|-----------|-------------|
| Memory | 128 MB / isolate | Containers (≤12 GB) or external compute |
| CPU time | 5 min paid (CPU, not wall) | Containers, Queues fan-out, external batch |
| Single DB | 10 GB (D1) | Multi-DB horizontal pattern or Hyperdrive → Postgres |
| Inbound TCP/UDP | HTTP/WebSocket/WebRTC only | Traditional cloud ingress (Spectrum proxies, not direct) |
| Cross-partition TX | None on platform | Sagas via Workflows or external RDBMS |

---

## Workload fit matrix

### Thrives

- Global API backends (no multi-region failover design)
- Edge auth / JWT validation / session gates
- Real-time coordination → **Durable Objects**
- I/O orchestration (webhooks, aggregation) — CPU billing favours waiting
- Multi-tenant SaaS → database-per-tenant on D1
- Edge AI inference (Workers AI, Vectorize)

### Struggles

- Memory-heavy buffering (large images, in-memory ML)
- Sustained CPU > ~30s per invocation
- Monolithic relational DB without partition story
- Inbound UDP/TCP (game servers, custom IoT protocols)
- Backend always in one region without Smart Placement / Hyperdrive strategy

### Per-workload checklist

1. Memory envelope? (<50 MB ideal; >100 MB → not Workers)
2. CPU profile? (<1s ideal; >30s → Containers/Queues/external)
3. User geography? (global → edge wins; single region → less edge benefit)
4. Backend locality? (Worker in Sydney + DB in Virginia reintroduces latency)
5. Protocol? (HTTP/WS yes; raw TCP/UDP no)
6. Coordination need? (DO alone can justify adoption)

---

## Hyperscaler concept map (selected)

| Hyperscaler | Cloudflare | Key difference |
|-------------|------------|----------------|
| Lambda | Workers | Sub-ms cold starts; CPU-time billing |
| API Gateway | Worker routes | No separate gateway SKU |
| DynamoDB | D1 + DO | SQL + actor coordination |
| S3 | R2 | Zero egress |
| ElastiCache | KV / DO | Eventual vs strong consistency |
| Step Functions | Workflows | Simpler durable steps |
| SQS | Queues | No visibility timeout ceremony |
| ECS/Fargate | Containers | Must route via Worker/DO; no direct inbound |
| CloudFront | Built-in | Every Worker deploy is CDN-backed |
| RDS Proxy | Hyperdrive | Edge pooling for external Postgres/MySQL |

### Mental models to unlearn

- **Cold starts** — not a Workers problem category
- **Connection pooling** — bindings eliminate pools for native storage; Hyperdrive for external DB
- **Regional architecture** — global default; restrict for compliance (jurisdictional placement)
- **NAT / ALB / auto-scaling config** — absent by design, not gaps

---

## Economics (representative API workload)

Author's 50M req/mo, 20ms CPU, 10 GB DB, 500 GB egress example: **~$280 AWS vs ~$50 Cloudflare** — gap driven by API Gateway per-request fees + S3 egress.

Cloudflare **not** cheaper when: compute-heavy per request, very low traffic (<$5 base), heavy cross-AZ/hyperscaler integration tax, active RI/savings plans.

Model with: request volume, **CPU ms not wall ms**, egress GB, eliminated warm-pool costs, engineering time for multi-region ops.

---

## Lock-in spectrum

| Level | Examples | Exit |
|-------|----------|------|
| Low | Stateless Worker logic, R2 (S3 API) | Mechanical |
| Medium | D1 (SQLite export), Queues, Workflows | Effort + pattern rewrite |
| High | Durable Objects, Workers for Platforms | Architectural redesign |

**Rule:** Accept lock-in proportional to differentiation value.

---

## Global blast radius (operational)

On hyperscalers, bugs often regional. On Cloudflare, **one bad deploy hits every PoP simultaneously**.

Implications: canary/gradual rollout, pre-deploy testing, real-time error/latency alerts, **practised instant rollback**.

---

## Migration & adoption (organisational)

### Builds momentum

- Measurable win (latency, egress $, ops hours)
- Low-dependency pilot first
- Visible progress dashboards

### Kills momentum

- Parity gate before cutover
- Silent parallel runs without comparison metrics
- Scope creep during migration
- Prior failed platform initiatives without quick proof

### Migration truth

- **Data migration** unpredictable; budget more than code migration
- Reframe success as outcomes ("sub-50ms auth globally") not feature parity
- Audit hidden assumptions: KV eventual consistency, no filesystem, SDK retry behaviour, timing expectations

---

## BrewHub integration notes

- **Hybrid by design:** OpenNext + API Worker at edge; Postgres SSOT via Hyperdrive; Python agents on fleet via Tunnel + HMAC
- **Kill switches:** payment state never KV-only; no inbound fleet ports; Access before Worker deploy
- **Sovereignty:** Data at rest stays on fleet Postgres; edge handles auth, cache, routing — not ledger SSOT
- **Zero Trust:** bundled DDoS/TLS on Worker routes; WAF/Access are explicit products when threat model requires depth

---

## Promoted anti-patterns

- Defaulting to AWS because familiar without constraint check
- Lift-and-shift expecting parity
- Worker → single-region DB on every request without Smart Placement
- Treating hybrid as failure state
- Deploying globally without rollback discipline

---

## Verify at decision time

Always re-fetch current limits/pricing from [Cloudflare docs](https://developers.cloudflare.com/workers/llms.txt) — numbers in the book are May 2026 snapshots.
