# ADR-0007: Backups — E2EE, user-held key, self-hosted blobs

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

Chat backups are the classic E2EE backdoor: WhatsApp's iCloud/Drive backups were plaintext subpoena-bait for years. Constraints here: iCloud/Google Drive are unreliable-or-blocked in TM, and "E2EE" is the product's pitch — so backups must be encrypted such that we (the operator) cannot read them.

## Decision

**Self-hosted, end-to-end encrypted backups** (ships Phase 4):

| Aspect | Design |
|---|---|
| Contents | Message history, contacts, profile, settings — exported from the local DB. **Never** Signal identity keys or sessions: a new device generates fresh keys (more secure, matches Signal's posture). |
| Encryption | Client generates a random **64-digit key**, shown once with explicit save-it-now UX; optionally also wrapped under a user password (argon2id). Blob encrypted client-side before upload. Server/MinIO never sees key or plaintext. |
| Storage | Our own MinIO (Railway phase → in-TM after migration). No Apple/Google dependency; identical behavior in both hosting phases and both stores. |
| Cadence | Daily auto-backup on Wi-Fi + charging, **incremental** (append encrypted delta segments, never full re-uploads) — full dumps are a denial-of-service attack on a 2 Mbps user. |
| Restore | Same phone number → OTP → enter 64-digit key → download → decrypt → import. This is the **phone-replacement** path. |
| Separation from multi-device | Linked devices (ADR-0006) start fresh; backups are not the multi-device history mechanism. Same separation WhatsApp uses. |

**Accepted consequence:** a user who loses both phone and 64-digit key loses history permanently. We cannot recover it, and that inability *is* the security guarantee. The UX must scream about saving the key at setup and after every backup.

## Consequences

### Positive
- No third-party cloud dependency; works behind TM Telecom exactly as abroad.
- Server compromise yields only opaque blobs — the E2EE promise covers rest, transit, *and* backup.
- Incremental deltas keep backups viable on 2 Mbps.

### Negative / accepted costs
- Key-loss grief is unavoidable; support cannot help. Mitigated by UX warnings, optional password wrap, and re-display prompts.
- Incremental segment format adds client complexity (manifest + segment GC).

## References

- Related: ADR-0003 (E2EE), ADR-0006 (multi-device separation), ADR-0008 (shared MinIO media plane)
