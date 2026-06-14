# Anti-Patterns

## Workers

### ❌ Global mutable state across requests
Isolates reuse memory unpredictably. Use DO/KV/Postgres for shared state.

### ❌ `await fetch()` to external API inside long DB transaction
Hold connections briefly — see supabase-specialist.

### ❌ Blocking `waitUntil` promises you need for correctness
`waitUntil` is best-effort; money paths must complete before response.

### ❌ Service Worker syntax in new projects
Use ES module `export default { fetch }`.

## Wrangler

### ❌ Secrets in `vars` or committed wrangler files
Use `wrangler secret put`.

### ❌ Stale `compatibility_date` for years
Miss security/runtime fixes.

### ❌ Skip `wrangler types` after binding changes
Type errors ship to production.

## Storage

### ❌ KV as payment or inventory SSOT
Eventual consistency + no relational queries.

### ❌ R2 listing as hot path
List operations are slow — index keys in D1/Postgres.

## Zero Trust

### ❌ Inbound port-forward "temporarily" on fleet boxes
Defeats tunnel architecture; Docker bypasses ufw anyway.

### ❌ Duplicate Access app per subdomain
Breaks wildcard policies; attach policies to existing apps.

### ❌ Access on websocket hostnames
Use private channels + session auth instead.

### ❌ Deploy Worker depending on Access before policy exists
Sequence: Access policy first, deploy second.

## OpenNext

### ❌ `@opennextjs/cloudflare` < 1.3.0
Known SSRF — upgrade.

### ❌ Only `next dev` before production Worker deploy
Use `opennextjs-cloudflare preview`.

## Agents

### ❌ Citing Worker limits from memory
Fetch current docs every session.
