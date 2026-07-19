# ADR-0001: Hosting strategy — Railway until store approval, then in-Turkmenistan

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

The product must ultimately serve users inside Turkmenistan, where Turkmenistan Telecom is a closed national network (see auto.tm-rewrite ADR-0005): TM users cannot reliably reach foreign servers, inbound SSH into TM works, VMs cannot have VPNs. WhatsApp itself is blocked/unreliable in TM — the reason this product exists.

At the same time, the first distribution milestone is **App Store + Google Play approval**. Store reviewers are abroad and must be able to reach the backend. Speed of iteration during development matters more than in-country latency, and no in-TM hardware is provisioned for this project yet.

Railway (foreign cloud) cannot serve in-TM users at scale — but it is ideal for the pre-approval phase.

## Decision

**Two-phase hosting:**

1. **Phase R (now → store approval)**: everything runs on Railway — API, worker, Postgres, Redis, MinIO, and (from Phase 3) coturn — deployed via GitHub Actions.
2. **Phase TM (post-approval)**: lift-and-shift the entire system to servers inside Turkmenistan Telecom, reusing the auto.tm-rewrite air-gap machinery (self-hosted runner → `docker save` tarball → scp → `docker load` → docker compose).

### Portability rules (binding from day one)

- Every service runs as a plain Docker container. **No Railway-proprietary managed features** that cannot be replicated with `docker compose` in-TM.
- Postgres, Redis, MinIO run as containers, not hosted add-ons with proprietary APIs.
- No outbound dependency on SaaS that is unreachable from TM (no Sentry cloud, no Twilio, no managed push other than FCM/APNS which are verified reachable from TM per auto.tm ADR-0009).
- The SMS OTP gateway (ADR-0009 here) lives in TM and is reached from Railway over its public IP (inbound into TM works); after the move it becomes a local call.

### Migration plan (owned from day one, not deferred)

`pg_dump` for the database, MinIO-to-MinIO object sync for media, DNS cutover for the API domain. Old Railway deployment stays up until in-TM smoke tests pass.

### Amendment 2026-07-20 — Railway environment topology

Three environments, sequenced by tenant: `development` (created 2026-07-20; default target for agents/sandboxes, pinned via `RAILWAY_ENVIRONMENT`), `production` (untouched until first beta users at/after approval), `staging` (created at the store-submission trigger; release candidates soak there and store reviewers point at staging — never at prod). Auth for automation: workspace-scoped `RAILWAY_TOKEN` in `.sandcastle/.env` (gitignored), with `RAILWAY_PROJECT_ID` pinned so agents deterministically target this project.

## Consequences

### Positive
- Fastest possible iteration and a working backend for store reviewers (abroad) during approval.
- Zero re-architecture at migration: containers, compose, and the auto.tm release machinery already exist.
- Push (FCM/APNS) and store binary distribution are unaffected by the move.

### Negative / accepted costs
- In-TM testers without VPN cannot reach the Railway deployment. Accepted: pre-approval testing is done by the developer and VPN-equipped testers.
- Railway bandwidth is metered; TURN relay traffic (ADR-0005) adds cost. Accepted at testing scale.

## References

- auto.tm-rewrite ADR-0005 (fully-in-TM air-gapped hosting) — the end-state model
- Related here: ADR-0004 (stack), ADR-0005 (calls/coturn), ADR-0009 (SMS gateway in TM)
