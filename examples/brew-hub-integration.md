# BrewHub Integration (Abstract)

## Edge + fleet topology

```
Internet
   │
   ▼
Cloudflare Edge ──▶ Workers (Next.js OpenNext + API adapter)
   │                      │
   │                      ├── Hyperdrive/pooler → Postgres (SSOT)
   │                      └── HMAC → Python tier (staff agents)
   │
   └── Access + Tunnel ──▶ Self-hosted fleet (Coolify, shop box, Pi)
                              cloudflared outbound only
```

## API Worker adapter pattern

Legacy serverless handlers (24 HTTP routers) serve through a **Lambda-shape adapter** on `brewhubphl-api` Worker:

- Handler code stays portable ESM
- Auth routing manual per handler
- Money-path handlers never trust client totals

Next.js Route Handlers proxy customer-facing calls; API Worker owns webhook finality.

## Healthz monitoring

Worker cron or external monitor probes fleet URLs:

- `redirect: 'manual'` — Access 302 = DOWN
- Service token headers on `/api/health` path-scoped Access apps
- Alerts → `system_errors` → SMS paging

## Service token sharing

One `CF-Access-Client-Id/Secret` pair in Doppler → allowed into multiple Access apps via Service Auth policies. Don't mint per-door secrets unless isolation requires it.

## OpenNext edge host

Customer UI at `edge.*` apex; DNS flip decoupled from API Worker. Build vars must include non-`NEXT_PUBLIC_` secrets for SSG.

## Kill switches

- No payment state in KV without Postgres reconciliation
- No tunnel bypass via public IPv6 container ports
- No new handler surface on decommissioning platforms without justification

## Private overrides

Fleet hostname tables, tunnel IDs, Doppler key names → private `brew-hub-overrides/` layer.
