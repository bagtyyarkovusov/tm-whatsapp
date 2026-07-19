# PRD 00 — Vision

## What this is

A WhatsApp-class messenger for Turkmenistan: 1:1 chat, media, and calls with genuine end-to-end encryption, designed from the ground up for ~2 Mbps networks and the closed Turkmenistan Telecom network.

WhatsApp itself is blocked/unreliable in TM. The product exists because the market's default messenger cannot reach its users — and the product wins by being the messenger that *does*, without asking users to trade privacy for reach.

## Promises (in priority order)

1. **It works where WhatsApp doesn't.** Reachable on TM Telecom, tolerates 2 Mbps and restrictive NATs, degrades gracefully (video → low-res → audio; queue-and-retry messaging).
2. **E2EE is real.** Signal Protocol for messages, DTLS-SRTP for calls, client-side-encrypted media and backups. The server stores ciphertext and prekey bundles — never plaintext, never identity keys, never the national social graph (ADR-0010).
3. **WhatsApp-parity UX.** Phone-number identity, contact discovery, linked devices, backups — the features users already expect, without Business features (explicitly out of scope).

## Non-goals (v1)

- WhatsApp Business / business API
- Group chat and group calls (Phase 5 — ADR-0002)
- Public username search / open discoverability (ADR-0010)
- Web client (deferred; becomes a linked device later — ADR-0006)

## Platforms

- **Mobile**: iOS + Android via one Expo codebase (ADR-0004). Mobile is the only surface until the web-linked-device decision is revisited.
- **Backend**: Railway until App Store + Play approval, then lift-and-shift in-TM (ADR-0001).

## Success milestones

| Milestone | Gate |
|---|---|
| Phase 1 complete → first store submission | App Store + Play approval (ADR-0001 exit trigger) |
| Post-approval | In-TM migration executed per ADR-0001 |
| Phases 2–4 | Feature parity for daily-driver usage |
| Phase 5 | Groups |

## Sister-project relationship

The stack (ADR-0004), OTP gateway (ADR-0009), session model, and deployment machinery deliberately reuse auto.tm-rewrite patterns (`~/Projects/auto.tm-rewrite`). Cross-referenced ADRs there are normative context, not dependencies — this repo stands alone.
