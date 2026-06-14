# Chapter 10: Realtime — Audio and Video

**Source:** [Architecting on Cloudflare](https://architectingoncloudflare.com/chapter-10) — Jamie Lord (May 2026)  
**Skill promotion:** `patterns/realtime-webrtc.md`, `patterns/durable-objects.md`, `anti-patterns.md`

---

## One-line thesis

**WebSockets (DO)** for data coordination; **WebRTC (Cloudflare Realtime)** for audio/video — different protocols, different infrastructure; don't use WebSockets for media.

---

## Two kinds of real-time

| Type | Transport | Latency tolerance | Use DO + WS |
|------|-----------|-------------------|-------------|
| Data | TCP/WebSocket | 100ms–seconds | Chat, cursors, dashboards, game state |
| Media | UDP/WebRTC | <150ms conversational | Video/voice calls, AI voice agents |

WebRTC drops packets; WebSocket retransmits — wrong tool for video frames.

---

## When DO suffices

Text chat, collaborative editing, live dashboards, turn-based games, presence/cursors — **Chapter 6 patterns**. One DO per room/session.

---

## When Cloudflare Realtime

Video conferencing, voice calls, interactive live stream, AI voice agents (<500ms E2E target), telehealth.

Needs: SFU, TURN, codec negotiation, RealtimeKit SDK.

---

## Anycast SFU

Each participant connects to **nearest PoP**; media crosses Cloudflare backbone — not single regional SFU trade-off.

Latency (typical RTT): same city 30–50ms; cross-continent 150–200ms.

TURN: ~8–15% connections need relay; budget **15%** consumer / **30%** enterprise. STUN free at `stun.cloudflare.com`. TURN ~$0.05/GB.

---

## Architecture pattern

```
DO — session auth, lifecycle, business logic
Realtime — media transport (WebRTC)
R2 — recordings
Queue — post-processing (transcription, EHR update)
Workers AI — whisper/summary on recording
```

DO coordinates; Realtime carries bits. Recording → R2 → Queue consumer.

RealtimeKit: JS, RN, Flutter, iOS, Android. Built-in recording to R2; live transcription via AI Gateway + Deepgram.

---

## Cost

Bandwidth-based ~$0.05/GB SFU egress (not per-minute). Audio-heavy much cheaper than Twilio/Chime per-minute.

4-person 720p 1hr ≈ 12–18 GB SFU egress ≈ $0.60–0.90.

---

## vs hyperscalers

Choose **Chime/Azure/Twilio** for PSTN dial-in, mature enterprise compliance track record, predictable per-minute budgeting.

Choose **Cloudflare** for global participants, audio-heavy, already on Workers/R2/AI stack, variable quality (bandwidth pricing rewards audio/low res).

---

## Failure modes

ICE timeout, TURN exhaustion, firewall UDP timeout on silence, permission revoked (iOS background), session state desync vs Realtime.

Debug: `webrtc-internals`, RTCP stats (loss, jitter, RTT), same-machine baseline test.

---

## Production notes

Not on v1 roadmap unless voice/video features planned.

If added: DO per consultation/session; Postgres/Hyperdrive for records metadata; R2 recordings; no WebSocket-as-video shortcut.

Platform assessment kill switch: inbound UDP to custom servers still not Workers — Realtime is the path.

---

## Key quotes

> "A dropped chat message is unacceptable; a dropped video frame is invisible."

> "Start with the simplest option that works."

> "Real-time media is harder to operate than request/response — budget for monitoring and support."
