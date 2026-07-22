# Architecture Decision Records

Single-context repo: ADRs live here at `docs/adr/`; current implemented state lives in the root `CONTEXT.md` (see `docs/agents/domain.md`).

| # | Title | Status | Date |
|---|---|---|---|
| [0001](0001-hosting-strategy.md) | Hosting: Railway until store approval, then in-Turkmenistan | Accepted | 2026-07-20 |
| [0002](0002-phased-scope.md) | Phased scope: five phases, groups deferred to Phase 5 | Accepted | 2026-07-20 |
| [0003](0003-e2ee-signal-protocol.md) | E2EE via the Signal Protocol (X3DH + Double Ratchet) | Accepted | 2026-07-20 |
| [0004](0004-technology-stack.md) | Technology stack: clone of auto.tm-rewrite | Accepted | 2026-07-20 |
| [0005](0005-calls-architecture.md) | Calls: P2P WebRTC + coturn, network-adaptive | Accepted | 2026-07-20 |
| [0006](0006-multi-device-model.md) | Multi-device: per-device Signal keys, QR linking, per-device fanout | Accepted | 2026-07-20 |
| [0007](0007-encrypted-backups.md) | Backups: E2EE, user-held 64-digit key, self-hosted blobs | Accepted | 2026-07-20 |
| [0008](0008-media-pipeline.md) | Media: client-side encrypt + compress, dumb ciphertext server | Accepted | 2026-07-20 |
| [0009](0009-auth-otp-sms-gateway.md) | Auth: SMS OTP via Android phone-fleet gateway (auto.tm pattern) | Accepted | 2026-07-20 |
| [0010](0010-contact-discovery-and-abuse.md) | Contact discovery (hashed + QR) and reporter-side abuse reports | Accepted | 2026-07-20 |
| [0011](0011-provisional-device-activation.md) | Provisional Device activation and expiry | Accepted | 2026-07-22 |

ADRs 0001–0010 originate from the founding grilling session (2026-07-20). ADR-0011 was accepted during Phase 1 implementation (2026-07-22). The sister project's ADRs at `~/Projects/auto.tm-rewrite/docs/adr/` are cross-referenced throughout; auto.tm ADR-0005 (air-gapped TM hosting) is the end-state model for ADR-0001 here.

ADR-0011 amends ADR-0009's auth-session issuance timing and ADR-0003's backend
cryptography boundary for public signed-prekey verification during activation.
