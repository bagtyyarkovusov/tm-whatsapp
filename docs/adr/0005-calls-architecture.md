# ADR-0005: Calls — P2P WebRTC + coturn, network-adaptive

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

Phase 3 ships 1:1 voice+video calls that must work on ~2 Mbps links with restrictive NATs (TM Telecom). The core fork:

- **A) P2P WebRTC** — media flows directly between the two phones, E2EE via DTLS-SRTP; no media server. What WhatsApp does for 1:1 calls.
- **B) SFU media server (LiveKit/mediasoup)** — required for group calls; for 1:1 it adds a giant infra component, meters every call minute, and terminates E2EE at the server.

## Decision

**A — P2P WebRTC for 1:1**, with this package:

| Piece | Choice |
|---|---|
| Client | `react-native-webrtc` (Expo config plugin + dev client) |
| NAT fallback | Self-hosted **coturn** (Railway during Phase R, in-TM after migration — ADR-0001) with **ephemeral TURN credentials** issued by the API (prevents abuse as an open relay) |
| Signaling | Offer/answer/ICE over the existing Socket.IO connection, encrypted inside the Signal session (ADR-0003) — call metadata stays private |
| Video codec | **H.264 hardware-encoded** preferred, VP8 fallback. Software VP9/AV1 rejected: battery + CPU cost on low-end phones |
| Audio codec | **Opus** with FEC + DTX — near-toll quality down to ~16 kbps, packet-loss concealment |
| 2 Mbps adaptation | WebRTC built-in congestion control (transport-cc) plus an explicit **degradation ladder**: start video at 320×240@15fps on poor links → scale up as RTT/loss allow → drop to audio-only below threshold, with a visible "poor connection" indicator |
| Native call UX | **CallKit + PushKit (iOS)**, ConnectionService (Android) via `react-native-callkeep`. Non-negotiable: without these, incoming calls cannot wake a locked iPhone and the app will not pass store review |

**Group calls (Phase 5)**: P2P meshes die beyond ~4 participants; an SFU (self-hosted LiveKit) is deferred to Phase 5 and decided then.

## Consequences

### Positive
- True E2EE for calls with zero media-server cost in the common case.
- coturn is one boring container — satisfies ADR-0001 portability.
- CallKit/PushKit from day one of Phase 3 removes a store-rejection risk at the approval milestone.

### Negative / accepted costs
- Relayed TURN traffic on Railway is metered (~0.5–1 GB/hour per relayed video call). Accepted at testing scale; one more reason the in-TM move matters.
- TURN capacity must be provisioned in-TM at migration (relayed calls are expected to be a real share under TM Telecom NATs).

## References

- Related: ADR-0001 (coturn hosting phases), ADR-0003 (signaling encryption), ADR-0002 (Phase 3/5 split)
