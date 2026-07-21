# PRD 02 — Phase 1 execution tree

This document turns the Phase 1 promises in `01-roadmap.md` into the release
tree tracked in GitHub. GitHub issue bodies and native dependency edges remain
the live execution source of truth.

## Definition of complete

Phase 1 is a store-submission-ready iOS and Android beta. Completion requires:

- phone OTP authentication, reviewer demo access, and provisional Device
  activation after Signal identity registration;
- privacy-preserving contact discovery and expiring signed QR contact adds;
- 1:1 text chat with Signal Protocol E2EE, durable local history/outbox,
  per-device fanout, offline recovery, receipts, typing, and presence;
- generic-content background push, blocking, reporter-consented reports, and a
  minimal authenticated moderation queue;
- device revocation, account deletion, three-language localization, and the
  agreed accessibility baseline;
- Railway development/staging deployments, security and privacy audit,
  cross-platform physical-device evidence, store artifacts, and submission.

Media, calls, groups, backups, reactions, replies, editing, forwarding,
disappearing messages, and remote deletion remain outside Phase 1.

## Execution waves

### Wave 0 — Agent platform

- Install Railway skill and Context7 in Sandcastle Claude Code.
- Replace stale Railway development credentials and IDs through a human gate.
- Enforce least-privilege credential injection and fresh-container preflight.
- Make review and PR publication issue-aware; never publish or close partial work.
- Establish issue template, labels, dependencies, local reference docs, and
  accurate implemented-state documentation.

### Wave 1 — Foundations

- Local Docker/Compose topology and database integration harness.
- Final Phase 1 schema and migrations.
- Signal/React Native binding research and approved ADR.
- SMS gateway contract, deterministic stub, and BullMQ dispatch foundation.
- Localization foundation.

### Wave 2 — Infrastructure, auth, and crypto

- Railway development services, API deployment, CI deploy, and rollback.
- OTP challenge lifecycle, auth sessions, reviewer bypass safeguards.
- Native Signal bindings, secure key state, and prekey API/lifecycle.
- Mobile API client, secure token storage, and session restoration.

### Wave 3 — Onboarding, discovery, and transport

- Mobile phone/OTP/Device activation UX.
- Approved private contact discovery and QR add flows.
- Versioned Socket.IO contracts, authenticated rooms, durable ciphertext relay,
  offline queue, idempotency, ordering, receipts, typing, and presence.
- Encrypted local message store and durable outbox.

### Wave 4 — Complete core product

- Per-device E2EE chat integration and safety-number UX.
- Push provider routing and mobile token/permission lifecycle.
- Blocking, reports, moderation retention, and suspension.
- Active-device revocation and account deletion.
- Localization completion and accessibility audit.

### Wave 5 — Release gate

- Threat-model/privacy invariant audit and self-hostable observability.
- Railway staging, EAS builds, reviewer configuration, and store artifacts.
- iPhone↔Android physical-device acceptance and ciphertext inspection.
- Manual App Store release / Google managed publishing submission.
- After approval: Phase TM migration, smoke tests, and a 20–30 person,
  fourteen-day invited pilot before Phase 2 receives ready work.

## Agent-readiness policy

At most two disjoint implementation PRs run concurrently. Shared schema,
contracts, crypto interfaces, and orchestration are single-writer surfaces.
Human/device/store steps are separate `ready-for-human` gates. Research issues
may be agent-ready; dependent implementation remains blocked until the decision
is approved and copied into an ADR and issue body.

See `docs/agents/agent-ready.md` for the complete execution contract.
