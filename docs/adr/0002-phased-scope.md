# ADR-0002: Phased scope — five phases, groups deferred to Phase 5

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

The product ambition is "most of WhatsApp's features": 1:1 chat, E2EE, media/file sending, voice+video calls, multi-sessions, linked devices, backups, and eventually groups. Building all of it before the first store submission is a 12+ month scope with zero user feedback.

## Decision

Ship in **five phases**, each a store submission (or a meaningful TestFlight/closed-track release):

| Phase | Ships | Rationale |
|---|---|---|
| **1. Core** | Phone OTP auth, contact discovery, 1:1 text chat, **E2EE from day one**, push notifications | E2EE retrofitted later is a nightmare — it is the foundation, not a feature. |
| **2. Media** | Photo/video/file sending, client-side compression, resumable uploads, auto-download rules | Needs the Phase 1 message pipeline; carries the 2 Mbps engineering (ADR-0008). |
| **3. Calls** | 1:1 voice + video calls, network-adaptive quality | Hardest infra (WebRTC, TURN); useless without the chat base (ADR-0005). |
| **4. Power features** | Linked devices, multi-session management UI, encrypted backups | Multi-device key distribution is far easier to design once 1:1 E2EE is proven (ADR-0006, ADR-0007). |
| **5. Groups** | Group chat (Sender Keys), group calls (SFU), group admin roles | Group E2EE is a different protocol and fanout model — its own product. |

**Group chat is explicitly out of scope until Phase 5.** This is the largest deliberately-deferred feature: it changes cryptography (Sender Keys vs 1:1 sessions), fanout, and the data model.

Phase exit criteria live in `docs/prd/01-roadmap.md`.

## Consequences

### Positive
- First store submission happens at Phase 1 completeness — months earlier than "everything."
- Each phase is additive; no phase requires reworking a shipped one (the device-aware schema from ADR-0006 is the key enabler).
- Store-approval milestone (ADR-0001) arrives with the smallest reviewable surface.

### Negative / accepted costs
- Users will ask for groups from day one. Accepted: 1:1-first is proven viable (early WhatsApp, Telegram).
- Phase 4 features (linked devices, backups) are flagship WhatsApp parity items that arrive late. Accepted: they depend on Phase 1 crypto being battle-tested.

## References

- `docs/prd/01-roadmap.md`
- Related: ADR-0003 (E2EE in Phase 1), ADR-0006 (device-aware schema from day one)
