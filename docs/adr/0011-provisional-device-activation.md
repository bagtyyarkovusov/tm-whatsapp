# ADR-0011: Provisional Device activation and expiry

- **Status**: Accepted
- **Date**: 2026-07-22
- **Deciders**: bagtyyar + Claude

## Context

OTP verification proves ownership of a phone number (ADR-0009), but it cannot prove that the client has generated a Signal identity or uploaded prekey material. We therefore need an intermediate onboarding state: a **provisional Device** that holds a slot in the Account's device cap but is restricted until it activates with valid Signal credentials. This ADR records the full lifecycle, retry, expiry, cleanup, and privacy contract so that auth, schema, API, and mobile work can proceed without inventing decisions.

## Decision

### State machine

| State | Meaning | Transitions |
|---|---|---|
| `PROVISIONAL` | OTP verified; waiting for Signal identity + prekey activation | `→ ACTIVE` on valid activation; `→ EXPIRED` on deadline or abandonment |
| `ACTIVE` | Fully operational Device with a normal auth-session family | `→ REVOKED` by user-driven revocation |
| `EXPIRED` | Provisional deadline passed or onboarding abandoned; terminal | Hard-deleted after a tombstone retention window |
| `REVOKED` | Active Device explicitly revoked by the account; terminal | Hard-deleted on normal revocation cleanup |

- `PROVISIONAL → REVOKED` is **not** allowed.
- No backward transitions (e.g., `EXPIRED → PROVISIONAL` or `ACTIVE → PROVISIONAL`) are allowed.

### Provisional creation

- A successful OTP verification creates a `PROVISIONAL` Device for the Account.
- The Device has a fixed, non-sliding expiry deadline of **24 hours** from OTP verification.
- The client creates a random installation UUID in platform-secure storage. It is used **only for deduplication**, never for authentication. Reinstalling creates a new installation identity.
- Repeated OTP verification for the same Account/installation pair returns the existing unexpired provisional Device.

### Restricted provisional credential

- A provisional credential is issued on OTP verification.
- It may only be used for:
  - reading its own activation status,
  - submitting or replaying activation,
  - refreshing within the fixed 24-hour deadline,
  - abandoning onboarding.
- It is **forbidden** from: messaging sockets, push registration, contact discovery, ciphertext delivery, and every normal authenticated route.

### Device cap and uniqueness

- `PROVISIONAL` and `ACTIVE` Devices share the approximately **five-slot** Account cap.
- Cap and installation uniqueness are enforced atomically.
- Expired tombstones do **not** count toward the cap.
- No active Device is evicted automatically to make room.
- Conflicts return HTTP `409`.

### Activation

Activation atomically validates and persists:

1. the identity public key,
2. the signed prekey,
3. the signed-prekey signature, verified by that identity key,
4. unique prekey IDs,
5. a non-empty one-time-prekey batch,
6. the Device label,
7. the new auth-session family.

Exact algorithm/version and one-time-prekey batch-size details come from the approved contracts in #31.

Before activation, the client generates and securely stores a **256-bit bootstrap secret**. On successful activation this secret becomes the initial refresh token for one normal auth-session family. The server stores only its hash. Normal rotation, reuse detection, and family revocation apply immediately (ADR-0006, ADR-0009).

### Activation replay

- Successful activation revokes normal use of the provisional credential.
- Until the original 24-hour deadline, that credential is still accepted **only** to replay an identical activation request with the same Device ID, bootstrap-secret hash, and activation-payload hash.
- Identical replays converge on the same active Device/session family and may mint a fresh access JWT.
- Changed material or concurrent conflicting activation returns `409`.
- Row locking/transactional serialization makes the first valid request win.

### Expiry and abandonment

- Expiry or explicit abandonment immediately transitions the Device to `EXPIRED`, revokes provisional sessions, and retains the Account.
- Expiry requires a fresh OTP plus a new Device ID to start again.
- Nothing can revive an expired Device.

### Tombstone cleanup

- An hourly, idempotent, bounded-batch job hard-deletes expired provisional tombstones after **seven days**.
- Cascades are limited to that provisional Device's own sessions and prekeys.
- Tombstones retain only: opaque Device ID, Account relation, installation-deduplication hash, timestamps, terminal reason, and aggregate-safe transition metadata.
- Tombstones **never** retain rejected activation payloads, bootstrap secrets, keys, prekeys, phone numbers, or credentials.

### Status endpoint

- The activation-status endpoint reveals only: the caller's Device ID, state, fixed expiry timestamp, and safe retry instruction.
- It never reveals installation UUID, platform, or label as authorization inputs.

### Privacy-safe observability

- Use aggregate counters for: creation, activation, expiry, abandonment, replay, conflict, and cleanup failure.
- Logs contain only opaque Device IDs and transition/error codes.
- No phone numbers, keys, or payloads are logged.

### Failure responses

| Status | Condition |
|---|---|
| `400` | Malformed activation material |
| `401` | Invalid provisional credential |
| `403` | Revoked or route-forbidden credential |
| `409` | Device cap, payload, or state conflict |
| `410` | Expired Device |
| `429` | Abuse limit; response includes `Retry-After` |
| `503` | Transient persistence failure; safe for identical retry |

## Consequences

### Positive

- Resolves the OTP-versus-Signal-identity deadlock with a single, complete contract.
- Keeps the server simple: it validates public material and stores hashes, never plaintext messages or keys.
- Replay and idempotency give the mobile client a safe recovery path across network loss and app kills.
- Bounded cleanup and tombstone retention keep the database bounded without losing audit metadata.

### Negative / accepted costs

- Adds a distinct provisional state and restricted credential that auth middleware must check.
- Activation is a multi-field atomic transaction that requires careful locking to guarantee "first valid request wins."
- The 24-hour fixed deadline is a policy choice; future ADRs must supersede this one if it changes.

## References

- `CONTEXT.md` glossary and Device invariants
- ADR-0003 (Signal Protocol and prekey bundles)
- ADR-0006 (multi-device model and auth-session separation)
- ADR-0009 (SMS OTP auth and per-device sessions)
- `docs/prd/02-phase-1-execution.md`
