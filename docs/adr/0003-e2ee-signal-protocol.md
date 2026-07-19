# ADR-0003: E2EE via the Signal Protocol (X3DH + Double Ratchet)

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

The product's core promise is privacy comparable to WhatsApp — for users inside Turkmenistan this is the entire pitch. Options considered:

- **A) Signal Protocol (X3DH key agreement + Double Ratchet)** via Signal's official `libsignal-client` (Rust core; Swift/Kotlin/Node bindings).
- **B) Signal Protocol semantics, pure-TypeScript implementation** — no native module, but available JS implementations are old/unaudited and slow across the RN bridge.
- **C) "E2EE-lite" (libsodium ECDH + AES, no ratchet)** — simplest, but no forward secrecy: one stolen key compromises all history. Fatal for this product's pitch.
- **D) MLS** — designed for large groups; mobile bindings immature; overkill for a 1:1-first product.
- **E) Adopt Matrix wholesale** — federation and E2EE for free, but the product becomes configuration of someone else's homeserver.

## Decision

**A — the Signal Protocol**, implemented as follows:

- Mobile clients use `libsignal-client` wrapped in an **Expo native module** (custom dev client via prebuild — already required by our stack, mirroring auto.tm-rewrite ADR-0002).
- The native module exposes a clean TypeScript interface (`IdentityService`, `SessionCipher`, `PreKeyStore`). The exact binding library is verified against current docs before implementation; if the RN binding story proves rotten, **B becomes the fallback behind the same interface** — protocol semantics identical, implementation swappable, no data migration.
- The **server never sees plaintext**: it stores per-device prekey bundles and relays ciphertext. The NestJS backend needs no crypto beyond TLS.
- All crypto code lives in `packages/crypto` behind the TS interface, with property-based tests (roundtrip, ratchet state) — bugs here are existential.

## Consequences

### Positive
- Forward secrecy + post-compromise security — the audited, industry-standard threat model.
- "As secure as WhatsApp" survives scrutiny because it is literally the same protocol family.
- Server stays simple and cannot be compelled to reveal message content it never possesses.

### Negative / accepted costs
- One-time native-module work (Swift/Kotlin wrapper + Expo config plugin).
- Expo Go is unusable for development; custom dev client required (already accepted in the stack decision).
- E2EE constrains media (ADR-0008: server cannot transcode) and backups (ADR-0007: user-held keys).

## References

- Related: ADR-0006 (multi-device key distribution), ADR-0007 (backups), ADR-0008 (media encryption)
