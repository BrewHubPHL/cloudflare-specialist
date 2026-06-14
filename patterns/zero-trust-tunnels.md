# Zero Trust Tunnels & Access

**Impact:** HIGH  
**Tags:** cloudflared, access, tunnel, self-hosted  
**Books:** Kerkour Ch.4.5 / Ch.9 — [summary](../references/book-summaries/cloudflare-book-ch09-access.md); Ch.10 checklist — [domain-setup-checklist.md](domain-setup-checklist.md)

Abstract patterns for exposing self-hosted fleet services (Coolify, Supabase, Pi boxes) without inbound ports.

Broader security, compliance, deployment, and secrets: `security-compliance.md`.

## Origin protection ladder (Kerkour)

| Priority | Method | When |
|----------|--------|------|
| 1 | **Cloudflare Tunnel** | Default — no open ports, edge TLS |
| 2 | Firewall **allowlist** [Cloudflare IPs](https://api.cloudflare.com/client/v4/ips) | Tunnel impossible |
| 3 | **Separate egress** for outbound fetches (RSS, webhooks) | Prevent SSRF IP leak |
| 4 | **Authenticated Origin Pulls** (mTLS) | High-assurance origin |
| 5 | **`X-Cdn-Token`** transform + origin validation | Belt-and-suspenders — see `domain-setup-checklist.md` |

Create tunnel: **Zero Trust → Access → Tunnels → Create** — Docker/systemd `cloudflared` on fleet box.

## Invariants

1. **One tunnel per machine** — many hostnames as routes inside it.
2. **Outbound-only** — `cloudflared` initiates connections; no port-forwarding on gateway.
3. **Every human hostname** gets a Cloudflare Access application (email/OIDC policy).
4. **Machine-to-machine** uses **service tokens** (Service Auth policy) — shared token identity can access multiple apps.
5. **Most specific Access path wins** — e.g. `/api/health` with Service Auth alongside email-only parent hostname.

## Published application route shapes

| Origin | Service URL | Notes |
|--------|-------------|-------|
| Local HTTP port | `http://localhost:8000` | Plain services |
| Traefik HTTPS | `https://localhost:443` | Set **Origin Server Name** = public hostname; **No TLS Verify** ON (edge terminates TLS) |
| WebSocket | `http://localhost:6001` | Do not put Access on WS hostname — handshake can't complete login redirect |

## Service token flow (Worker → protected origin)

1. Create service token in Zero Trust → Service Auth
2. Add **Service Auth** policy to existing Access app (don't create duplicate per-hostname app)
3. Worker sends `CF-Access-Client-Id` + `CF-Access-Client-Secret` headers
4. Health monitors: treat HTTP 302 to Access login as **DOWN** (`redirect: 'manual'`)

## cloudflared ops

- Install via dashboard connector → **systemd** unit survives reboot
- Tunnel DOWN usually means machine off — not broken config
- Deleting tunnel may leave stale DNS CNAMEs — clean zone before re-add

## Tailscale complement

Tailscale mesh for SSH/admin; tunnels for public hostname exposure. Don't conflate tailnet SSH success with password sshd state.

## References

- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)
- [Access policies](https://developers.cloudflare.com/cloudflare-one/policies/access/)

Hand off Coolify install/backup to `coolify-hetzner-specialist`.
