# Workers Fundamentals

**Impact:** CRITICAL  
**Tags:** workers, fetch, modules, env

## Module Worker shape (required format)

```typescript
export interface Env {
  MY_KV: KVNamespace;
  MY_BUCKET: R2Bucket;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response('ok');
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
```

## Request handling

- Return `Response` early on auth failures — don't run expensive logic first.
- Use `ctx.waitUntil()` for fire-and-forget (analytics, audit) — not payment commit.
- Stream responses when bodies are large; avoid buffering entire payloads in memory.

## Compatibility

```jsonc
{
  "compatibility_date": "2026-06-14",
  "compatibility_flags": ["nodejs_compat"]
}
```

Set `compatibility_date` to a recent date. Check [compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) before pinning.

## Environments

```jsonc
{
  "name": "my-api",
  "env": {
    "staging": { "vars": { "ENV": "staging" } },
    "production": { "vars": { "ENV": "production" } }
  }
}
```

Deploy: `wrangler deploy --env production`

## Local development

| Command | Behavior |
|---------|----------|
| `wrangler dev` | Local workerd; bindings simulated locally by default |
| `wrangler dev --remote` | Execute on Cloudflare network |
| Remote binding (`"remote": true`) | Local code, remote KV/R2/etc. |

Populate local bindings with [local data](https://developers.cloudflare.com/workers/development-testing/local-data/) for integration tests.

## Observability

Enable observability in wrangler:

```jsonc
{ "observability": { "enabled": true } }
```

Use Workers Logs + tail consumers for debugging; avoid `console.log` as sole production signal.

## References

- [Workers llms.txt](https://developers.cloudflare.com/workers/llms.txt)
- [Migrate to module workers](https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/)
