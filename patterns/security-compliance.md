# Security & Compliance

**Impact:** CRITICAL  
**Tags:** security, compliance, deployment, auth, secrets  
**Book:** Ch.21 — `references/book-summaries/architecting-on-cloudflare-ch21-security-compliance.md`

Tunnel and Access runbooks: `zero-trust-tunnels.md`. Observability/audit: `observability-operations.md`.

---

## Isolate model (what platform gives you)

Workers run in **V8 isolates** — ephemeral memory, no cross-customer access (sandbox, memory keys, cordons, seccomp layer-2).

**Does not protect:**

- Your code exfiltrating data via allowed `fetch`
- Over-permissive bindings (staging Worker → production D1)
- Secrets in logs; PII in KV without TTL
- npm supply chain

Defence through **absence**: no hi-res timers, no threads, no filesystem, outbound via controlled proxy.

For threading/precise timing needs → Containers (different trust model).

---

## Authentication

Reject bad auth **at the edge** before Hyperdrive/Postgres — saves compute and shrinks attack surface.

| Scenario | Pattern |
|----------|---------|
| Internal / staff tools | **Cloudflare Access** — OIDC/SAML |
| Consumer app | Custom **JWT** validation in Worker |
| B2B SSO | Access or SAML integration |
| Public API | API keys + rate limits |
| Worker → fleet origin | **Service tokens** — `zero-trust-tunnels.md` |
| Mixed audience | Access for staff; JWT for customers |

```typescript
// JWT at edge (illustrative — use your auth library)
const token = request.headers.get("Authorization")?.replace("Bearer ", "");
const claims = await verifyJwt(token, env.JWT_SECRET);
if (!claims) return new Response("Unauthorized", { status: 401 });
```

---

## Session storage

| Session shape | Store |
|---------------|-------|
| Opaque token + metadata (60s staleness OK) | KV |
| List/revoke all sessions; strong consistency | D1 |
| WebSocket / multi-tab coordination | Durable Object |

Payment/session authority for money → **Postgres SSOT**, not KV alone.

---

## Secrets

**Default:** `wrangler secret put` / Secrets Store — encrypted, injected per request.

**External vault** when: PCI rotation audit, dynamic DB credentials, multi-cloud single source.

**Rotation:** dual-key validity window — accept old + new during migration.

API tokens: narrow scopes; prefixes `cfk_` / `cfat_` scannable; GitHub secret scanning auto-revoke — still don't commit secrets.

Resource-scoped Access/API roles for agents and CI — not account admin.

---

## Compliance by design

Platform certs (SOC 2, ISO 27001, GDPR docs, HIPAA BAA, PCI) cover **Cloudflare infrastructure** — you implement application controls.

### GDPR

- Single **`user_id`** across D1, R2 keys, KV, DO storage
- Deletion/export as designed workflow — not forensic hunt
- Data minimisation: cheap storage ≠ keep everything

### PCI

**Scope reduction:** Stripe/Adyen/etc. tokenise — Workers never see PAN.

### HIPAA

BAA required; you still need access control, audit trails, minimum necessary.

### Data residency (Enterprise DLS)

Regional Services, Geo Key Manager, Customer Metadata Boundary — each adds latency; verify product compatibility before committing.

---

## Deployment as hypothesis testing

Cloudflare keeps **previous Worker version running** — rollback = route traffic back (milliseconds).

### Before deploy — write down

- Max error rate delta vs baseline
- P99 latency ceiling
- Business metric guardrails (conversion, checkout success)
- "No new error signatures"

### Gradual rollout

| Risk | Starting % |
|------|------------|
| Auth, payments, schema | 1% |
| New features | 10% |
| Bug fixes, low risk | 50% |

Bake ~1 hour or 10k requests per stage. **Rollback immediately** when triggers fire.

### Environments

Same artifact, **different bindings** — staging D1/KV/R2 vs production. Avoid `if (ENV === 'staging')` code paths.

Use **feature flags** (KV) for kill switches — not environment conditionals.

### Workers Builds

Git → build → `wrangler deploy`; preview URLs per branch. External CI when: self-hosted Git, multi-service atomic migrations, heavy test gates.

See `wrangler-config.md` for env-specific config.

---

## Private connectivity

| Layer | Use |
|-------|-----|
| **cloudflared tunnel** | Fleet Postgres, Coolify, internal APIs — outbound only |
| **VPC Services (beta)** | Binding to single private endpoint — SSRF-safe |
| **Mesh / `cf1:network`** | Agents reaching internal hosts without per-host setup |

Worker edge: unified auth, rate limits, logging before Hyperdrive or Tunnel hop.

Same-zone **service bindings** bypass WAF — enforce auth in callee Worker.

---

## Edge hardening

### Rate limiting

| Need | Mechanism |
|------|-----------|
| Abuse prevention (~approx OK) | KV counters |
| Contractual exact quotas | DO per user (`idFromName(userId)`) |

### Input validation

Zod (or equivalent) at edge — invalid payloads never hit Postgres.

### Dependencies

Minimise npm surface — supply chain attacks target fat bundles.

### WAF

Platform WAF for HTTP threats; don't rely on WAF alone for app authZ.

---

## Audit & agents

- Logpush → R2 for compliance retention (`observability-operations.md`)
- Agent actions: trace every tool call; kill switch on anomaly (`agents-sdk.md`)
- MCP/OAuth: server-issued tokens; resource-scoped tool registration

---

## Production checklist

- [ ] Access on human hostnames; service tokens for Worker → fleet
- [ ] No duplicate Access app per subdomain
- [ ] Payment via processor tokens; ledger in Postgres
- [ ] Canary + instant rollback on API/OpenNext Workers
- [ ] KV feature flags for emergency disable
- [ ] GDPR deletion job knows R2 prefix + Postgres + KV keys
- [ ] Secrets via wrangler; never in repo

---

## References

- [Workers security model](https://developers.cloudflare.com/workers/reference/security/)
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Zero Trust tunnels](zero-trust-tunnels.md)
- [Platform assessment](platform-assessment.md) — when Cloudflare isn't the fit
