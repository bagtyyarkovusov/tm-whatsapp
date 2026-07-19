# ADR-0009: Auth — SMS OTP via Android phone-fleet gateway (auto.tm pattern)

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

Phone-number identity requires SMS OTP, and Turkmenistan has no reliable commercial SMS gateway (Twilio et al. unreachable/unreliable from TM Telecom). The auto.tm project solved this in production: a homegrown gateway dispatching SMS through SIM-equipped Android phones (auto.tm-rewrite ADR-0006). The user has explicitly decided: **same concept here**.

## Decision

**Reuse the auto.tm OTP architecture:**

- `apps/sms-gateway` (Node service) coordinates a fleet of 5–20 Android phones running a Kotlin foreground-service agent; phones connect over persistent WebSocket; gateway routes outbound SMS round-robin with per-SIM rate limits and randomized delays.
- API generates a 6-digit OTP (hashed at rest, 5-min TTL), enqueues to the gateway; on verify, issues access token + per-device refresh token.
- **Sessions**: per-device hashed refresh tokens with rotation and sliding expiry — auto.tm-rewrite **ADR-0012 pattern, reused verbatim**, aligned with the per-device model of ADR-0006 here.
- **OTP_TEST_MODE**: returns the code in the API response without sending — for CI/dev.
- **Reviewer demo account**: fixed-OTP bypass for store reviewers (auto.tm-rewrite ADR-0030 pattern). Mandatory: Apple/Google reviewers cannot receive TM SMS, and store approval is the ADR-0001 milestone.

**Hosting topology during Phase R:** the gateway + phone fleet live in TM; the Railway-hosted API reaches the gateway over its **public IP** (inbound into TM works — auto.tm ADR-0005). After the in-TM migration this becomes a local call.

**Crypto note:** OTP authenticates the *account* (phone number). The Signal identity keypair (ADR-0003) is generated on-device at registration and is never derived from or protected by the OTP.

## Consequences

### Positive
- Proven-in-production OTP delivery with zero third-party SMS dependency — works identically in both hosting phases.
- Store-approval path de-risked by the demo-account pattern.
- Auth and E2EE layers cleanly separated.

### Negative / accepted costs
- Operating a physical phone fleet is real ops burden (SIM balance, per-SIM daily caps, hardware failure).
- Cross-border Railway→TM gateway hop adds OTP latency during Phase R (acceptable: seconds, and only pre-approval).
- SIM-swap attacks remain the weak point of phone-number identity — accepted, as it is for WhatsApp itself.

## References

- auto.tm-rewrite ADR-0006 (phone OTP + custom Android SMS gateway), ADR-0012 (multi-device sessions), ADR-0030 (reviewer demo account)
- Related here: ADR-0001 (hosting phases), ADR-0003 (key separation), ADR-0006 (per-device sessions)
