# ADR-0006: Multi-device model — per-device Signal keys, QR linking, per-device fanout

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

"Linked devices" and "multi sessions" ship in Phase 4, but the model must be fixed now because retrofitting device-awareness into a single-device E2EE schema is the most painful migration in this domain. The old WhatsApp model (phone must be online; web mirrors it) is rejected in favor of the modern one (every device independent).

## Decision

**Modern WhatsApp/Signal multi-device model, phone-number-centric:**

| Aspect | Design |
|---|---|
| Account identity | Account = phone number. Each **device** has its own Signal identity keypair. The account's device list is signed; key changes across devices are detectable ("security code changed" warnings). |
| Linking flow | New device shows a QR containing its identity public key + one-time linking token → an existing authorized device scans and **cryptographically signs/approves** → server adds the device to the account's device list. No SMS needed for device #2+. |
| Message fanout | Sender encrypts separately for **each device of each recipient** (per-device Signal sessions + per-device prekey bundles — the "Sesame" pattern). Server relays ciphertext into per-device queues. |
| History on new device | **None.** Linked devices start fresh. Encrypted history transfer from a sibling device is a later enhancement. |
| Management | "Linked devices" screen: list devices (label, last active), revoke any → server stops fanout, senders re-encrypt excluding it. Cap ~5 devices per account. |
| Auth sessions | Separate layer from Signal sessions: per-device refresh tokens (hashed, rotating, sliding expiry) — the auto.tm-rewrite ADR-0012 pattern, reused verbatim. |
| Web client (future) | Just another linked device type speaking the same protocol; QR linking is platform-agnostic, so web costs no redesign. |

**Schema consequence (binding from Phase 1):** the data model is device-aware from day one — one `User` → N `Device` rows → N prekey bundles. The Phase 4 work is UI + linking flow, not schema surgery.

## Consequences

### Positive
- No phase-4 migration crisis; device fanout is a small extension of Phase 1's send path.
- Phone-free operation of linked devices (WhatsApp's biggest UX win since 2021) comes free from the model.
- Auth and crypto layers stay cleanly separated (sessions vs ratchets).

### Negative / accepted costs
- Phase 1 send path is slightly more complex (per-device encryption even when N=1).
- Fresh-start linked devices will prompt "where are my old messages?" — mitigated by ADR-0007 backups for the phone-replacement case.

## References

- auto.tm-rewrite ADR-0012 (multi-device sessions, per-session refresh tokens)
- Related here: ADR-0003 (Signal protocol), ADR-0007 (backups), ADR-0009 (auth sessions)
