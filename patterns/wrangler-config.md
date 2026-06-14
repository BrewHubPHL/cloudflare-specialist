# Wrangler Configuration

**Impact:** CRITICAL  
**Tags:** wrangler, wrangler.jsonc, deploy, types

## Prefer wrangler.jsonc

Newer binding features are JSON-first. Commit `wrangler.jsonc` to git — never secrets.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "brewhub-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-14",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "vars": {
    "PUBLIC_APP_URL": "https://example.com"
  }
}
```

## Secrets

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# or Secrets Store binding in wrangler.jsonc
```

Never put secrets in `vars` — they're visible in dashboard and wrangler.toml history.

## Type generation

```bash
wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts
```

Run after every binding change. Import `CloudflareEnv` in handlers.

## Core commands

| Task | Command |
|------|---------|
| Local dev | `wrangler dev` |
| Deploy | `wrangler deploy` |
| Tail logs | `wrangler tail` |
| Startup profile | `wrangler check startup` |
| Whoami | `wrangler whoami` |

## OpenNext worker main

```jsonc
{
  "main": ".open-next/worker.js",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

## Auto-detect deploy

`wrangler deploy` without config can auto-generate Next.js Worker config — verify output before production reliance.

## CI deploy

Set `CLOUDFLARE_API_TOKEN` with least-privilege (Workers Scripts:Edit). Store in CI secrets — not repo.

## Static assets (full-stack)

```jsonc
{
  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "run_worker_first": false,
    "not_found_handling": "single-page-application"
  }
}
```

See `full-stack-applications.md` for rendering strategy, SSR, and caching.

## References

- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Full-stack on Workers](full-stack-applications.md)
