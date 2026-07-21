# PRD 01 — Roadmap (five phases)

Per ADR-0002. Each phase ends in a store submission (or meaningful TestFlight/closed-track release). Exit criteria are the gate; nothing ships past its gate.

The detailed Phase 1 release and agent execution tree is defined in
[`02-phase-1-execution.md`](02-phase-1-execution.md).

## Phase 1 — Core

**Ships:** phone OTP auth · contact discovery · 1:1 text chat with E2EE from day one · push notifications.

- OTP via Android phone-fleet gateway (ADR-0009), incl. `OTP_TEST_MODE` + reviewer demo account.
- Signal identity registration: on-device keypair, prekey bundle upload, per-device-aware schema (ADR-0006).
- X3DH session establishment + Double Ratchet messaging (ADR-0003); send/receive over Socket.IO.
- Hashed contact discovery + QR adds (ADR-0010).
- Delivery states: sent / delivered / read; typing + presence; offline queue with retry.
- Block + reporter-side report (ADR-0010).
- FCM/APNS push (background) + Socket.IO in-app events (foreground).

**Exit criteria:** two physical devices exchange E2EE messages over the Railway deployment; push works backgrounded; reviewer demo account logs in without SMS; security-code-change warning demonstrable.

## Phase 2 — Media

**Ships:** photo/video/file sending, client-side compression, resumable uploads, auto-download rules (ADR-0008).

- Per-attachment AES-256 keys inside Signal messages; encrypted thumbnails inline.
- Images → 1600px WebP; videos → H.264 480p @ ~600 kbps on-device.
- S3 multipart presigned uploads (5 MB parts, pause/resume, background task); range-request downloads.
- Auto-download rules (mobile data = photos only); 100 MB cap; documents lane for large files.
- `apps/worker` scaffolded (push fanout moves off the API).

**Exit criteria:** a 90-second video sends, resumes after a forced network drop mid-upload, and plays progressively on the recipient — on a throttled 2 Mbps link; server holds only ciphertext (verified by inspection).

## Phase 3 — Calls

**Ships:** 1:1 voice + video calls, network-adaptive (ADR-0005).

- P2P WebRTC (`react-native-webrtc`); signaling encrypted inside Signal sessions over Socket.IO.
- coturn deployed (Railway) with ephemeral credentials; H.264/Opus; degradation ladder + "poor connection" UI.
- CallKit + PushKit (iOS), ConnectionService (Android) — incoming call wakes a locked phone.

**Exit criteria:** call completes P2P on open NAT and via TURN on symmetric NAT; video visibly degrades to audio-only under 256 kbps throttle and recovers; locked-iPhone incoming-call UI works.

## Phase 4 — Power features

**Ships:** linked devices · multi-session management · encrypted backups (ADR-0006, ADR-0007).

- QR device linking with signed approval; per-device fanout; linked-devices screen with revocation (~5 device cap).
- E2EE backups: 64-digit user key, optional password wrap, incremental deltas to MinIO, restore-on-reinstall flow.

**Exit criteria:** second device linked by QR receives new messages (fresh history); revoked device stops receiving; wipe + reinstall + OTP + 64-digit key restores full history.

## Phase 5 — Groups

**Ships:** group chat (Sender Keys), group admin roles, group calls (SFU — self-hosted LiveKit, decided at phase entry).

Scope defined at phase entry, informed by Phases 1–4 usage. Not scheduled.

---

## Cross-phase invariants

- Device-aware schema from day one (ADR-0006) — never migrated, only extended.
- Server never stores: plaintext messages, plaintext media, identity keys, contact graphs, backup keys.
- Every backend component is a portable container (ADR-0001); in-TM migration is rehearsed before it's needed.
