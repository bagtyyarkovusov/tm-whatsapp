# CONTEXT.md — tm-whatsapp

**Current implemented state of this repo.** Describes what exists today — not ambition (that's `docs/prd/`), not decisions (that's `docs/adr/`). Updated as part of any PR that changes domain invariants. See `docs/agents/domain.md`.

## State as of 2026-07-20

**Greenfield.** No application code exists. What exists:

- `docs/adr/0001–0010` — all foundational architecture decisions, accepted 2026-07-20 (founding grilling session)
- `docs/prd/00-vision.md`, `docs/prd/01-roadmap.md` — product vision and five-phase roadmap
- `docs/agents/` — issue-tracker, triage-label, and domain-doc conventions (this file's format)
- GitHub Issues on `bagtyyarkovusov/tm-whatsapp` — sprint planning surface

Nothing below is implemented yet. The glossary defines vocabulary that code, issues, and tests must use consistently once they exist.

## Glossary

| Term                   | Meaning                                                                                                                             | Avoid saying                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Account**            | A user's identity, keyed by phone number (`+993XXXXXXXX`). One account → many devices.                                              | "user" when you mean the auth/identity entity                                  |
| **Device**             | One installation linked to an account, with its own Signal identity keypair and auth session. Cap ~5 per account.                   | "session" for the device itself                                                |
| **Auth session**       | Per-device hashed refresh token with rotation + sliding expiry (auto.tm ADR-0012 pattern). Distinct from Signal sessions.           | "login" (it's a thing, not an event)                                           |
| **Signal session**     | A Double Ratchet state between two specific devices.                                                                                | "encryption session"                                                           |
| **Prekey bundle**      | Per-device set of public keys uploaded to the server enabling X3DH session establishment. Server stores these; they are not secret. | "identity keys on the server" (identity _private_ keys never leave the device) |
| **Linked device**      | A device added via QR scan + signed approval from an existing device (ADR-0006). Starts with fresh history.                         | "paired device"                                                                |
| **Ciphertext message** | What the server stores and relays. Opaque to the server by construction.                                                            | "message" in server code — always qualify                                      |
| **Attachment key**     | Random per-attachment AES-256 key; media ciphertext lives in MinIO, key travels inside the Signal message (ADR-0008).               | "media password"                                                               |
| **Backup key**         | User-held 64-digit key encrypting backup blobs. Unrecoverable by the operator — by design (ADR-0007).                               | "recovery code"                                                                |
| **Degradation ladder** | Call policy: 320×240@15 → scale up → audio-only below threshold, with "poor connection" UI (ADR-0005).                              | "adaptive bitrate" (that's the mechanism; the ladder is our policy)            |
| **Phase R / Phase TM** | The two hosting phases: Railway pre-approval, in-Turkmenistan post-approval (ADR-0001).                                             | "prod vs staging"                                                              |

## Architectural invariants (enforced once code exists)

1. **The server never stores**: plaintext messages, plaintext media, Signal identity private keys, contact graphs, backup keys.
2. **Device-aware schema from day one** (ADR-0006): `Account` → N `Device` → N prekey bundles. Never collapse to single-device shape.
3. **Portability** (ADR-0001): every backend component is a plain Docker container; no Railway-proprietary features.
4. **Three transports, no overlap** (ADR-0004): Socket.IO (chat/signaling), HTTPS/MinIO (media, backups), WebRTC (calls).

## Where things will live (planned layout — ADR-0004)

```
apps/
  api/          NestJS + Prisma + Socket.IO
  mobile/       Expo (iOS + Android)
  worker/       BullMQ consumer (scaffolded at Phase 2)
  sms-gateway/  OTP fleet coordinator (in TM; ADR-0009)
packages/
  db/           Prisma schema + migrations
  contracts/    Zod schemas shared API ↔ mobile
  crypto/       libsignal TS interface (ADR-0003)
```
