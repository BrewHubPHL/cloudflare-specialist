# Realtime — WebRTC & Media

**Impact:** MEDIUM  
**Tags:** webrtc, realtime, sfu, turn, durable-objects  
**Book:** Ch.10 — `references/book-summaries/architecting-on-cloudflare-ch10-realtime-webrtc.md`

Data coordination: `durable-objects.md` (WebSockets). This file is **audio/video only**.

---

## Decision tree

```
Need audio/video between participants?
  NO  → Durable Objects + WebSockets
  YES → Cloudflare Realtime (WebRTC) + RealtimeKit SDK
```

WebSockets guarantee delivery (TCP) — wrong for media latency. WebRTC accepts packet loss (UDP).

---

## DO + WebSocket suffices for

- Text chat, collaborative editing (OT/CRDT in app logic)
- Live dashboards, tickers, IoT feeds
- Turn-based / many multiplayer games
- Presence, cursor tracking

Pattern: `idFromName(`${roomId}`)` + WebSocket hibernation API.

---

## Cloudflare Realtime for

- Video/voice conferencing (SFU, not mesh >4 participants)
- Interactive live stream segments
- AI voice agents (target E2E <500ms)
- Telehealth / screen share

Components: **SFU** (anycast 300+ PoPs), **TURN** (relay when P2P fails), **RealtimeKit** client SDK.

---

## Architecture

```
Browser ←WebRTC→ Cloudflare Realtime (SFU/TURN)
                    ↑
Worker / DO — issue tokens, session lifecycle, auth
Post-call → R2 recording → Queue → Workers AI (transcription)
Metadata → D1 or Hyperdrive Postgres
```

**DO for coordination; Realtime for media.** Do not tunnel video over WebSockets.

Example flow:

1. Client requests join → Worker validates → DO creates Realtime session + token
2. RealtimeKit joins with token; media flows via WebRTC
3. On end → DO enqueues post-processing; recording in R2

---

## TURN & connectivity

- STUN: `stun.cloudflare.com` (discover public addresses)
- TURN fallback when symmetric NAT / corporate firewall blocks UDP
- Budget **~15%** TURN traffic (consumer); **~30%** enterprise
- Media encrypted DTLS end-to-end; TURN relays ciphertext

---

## RealtimeKit (sketch)

```typescript
import { RealtimeKit } from "@cloudflare/realtimekit";

const rtk = new RealtimeKit({ token: serverIssuedToken });
const session = await rtk.join({ sessionId: roomId, displayName: name });
await session.enableCamera();
await session.enableMicrophone();

session.on("connectionStateChanged", (state) => {
  // connecting | connected | reconnecting | failed
});
```

Handle `NotAllowedError`, `NotFoundError`, `NotReadableError` for device permissions.

Recording: configure server-side → R2 output path. Live captions: RealtimeKit `ai_config.transcription` + AI Gateway.

---

## Cost (verify current pricing)

~**$0.05/GB** SFU egress (bandwidth model, not per-minute).

Rough 4-person 720p 1 hour: ~12–18 GB ≈ **$0.60–0.90**. Audio-only dramatically lower.

Compare per-minute providers when budgeting fixed minute rates vs variable quality.

---

## Operations

Monitor: packet loss, jitter, RTT, connection success rate, time-to-first-frame (<3s target).

Test: Chrome network throttling (3% loss, 200ms latency), real mobile devices, multi-region participants.

Failure vocabulary: ICE timeout, TURN exhaustion, firewall silence timeout, permission persistence (iOS), app/Realtime state desync.

Debug: `chrome://webrtc-internals`, RealtimeKit stats, two browsers same machine baseline.

---

## vs hyperscalers

| Choose Cloudflare | Choose Chime / Azure / Twilio |
|-------------------|-------------------------------|
| Global anycast participants | PSTN phone dial-in required |
| Audio-heavy / variable quality | Per-minute budget predictability |
| Already on Workers/R2/AI | Deep AWS/Azure compliance history |

---

## BrewHub

Not default v1 scope. If voice/video added later: DO session + Realtime media + Postgres records + R2 recordings + Queue for transcription.

Kill switch: do not attempt custom UDP servers on Workers — use Realtime or external WebRTC infra.

---

## References

- [Cloudflare Realtime](https://developers.cloudflare.com/realtime/)
- [RealtimeKit](https://developers.cloudflare.com/realtime/realtimekit/)
- [Durable Objects WebSockets](durable-objects.md)
- [Ch.10 summary](../references/book-summaries/architecting-on-cloudflare-ch10-realtime-webrtc.md)
