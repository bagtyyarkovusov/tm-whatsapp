# ADR-0010: Contact discovery (hashed + QR) and reporter-side abuse reports

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

Two design points live at the E2EE boundary:

1. **Discovery**: WhatsApp uploads address books to find friends — in a country of ~6M people, a server-side social graph of the nation is a liability we must not create.
2. **Abuse**: with E2EE, the server cannot read flagged content, so "report a message" cannot mean "moderator reads it from the server."

## Decision

### Contact discovery

- **Hashed phone-contact matching (Signal-style):** the client SHA-256s normalized phone numbers of the user's contacts; the server matches hashes against registered users and returns matches. The uploaded list is never stored; the server retains no contact graph.
- **QR-code add:** in-person contact adding by scanning — near-free, since QR infrastructure already exists for device linking (ADR-0006).
- **No public username search** in v1: in a small country, public discoverability is a doxxing/spam cannon. Revisit post-launch with guardrails if demanded.

### Abuse reporting & blocking

- **Block:** server stops fanout between the pair (both directions), presence/last-seen hidden.
- **Report:** the *reporter's own device* voluntarily attaches the last N messages (decrypted, since the reporter is a legitimate reader) plus the reported account's identity to a moderation queue. E2EE is intact — content comes from a party entitled to read it.
- Moderation surface: a minimal admin queue (reuse auto.tm admin patterns) — scope kept small until real volume exists.

## Consequences

### Positive
- No national social graph sits on our servers — a regulatory and ethical de-risking unique to the TM context.
- Abuse handling survives E2EE without backdoors.
- QR adds double as a growth mechanic (in-person onboarding).

### Negative / accepted costs
- Hashed discovery is theoretically brute-forceable (phone space is small); mitigated with rate limiting + HMAC with a server-side pepper, accepting the standard Signal trade-off.
- Reports can be fabricated (reporter controls the plaintext); moderation treats them as leads, not proof.

## References

- Related: ADR-0003 (E2EE boundary), ADR-0006 (QR infrastructure), ADR-0009 (phone-number identity)
