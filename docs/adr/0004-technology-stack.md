# ADR-0004: Technology stack — clone of auto.tm-rewrite

- **Status**: Accepted
- **Date**: 2026-07-20
- **Deciders**: bagtyyar + Claude (founding grilling session)

## Context

Greenfield repo. The sister project (auto.tm-rewrite, ADR-0002 there) already operates a stack that satisfies nearly identical constraints: real-time chat over WebSockets, air-gap-deployable, strong typing across mobile and API, monorepo. The novel risks in this project are the Signal protocol, WebRTC calls, and 2 Mbps adaptation — novelty anywhere else is waste.

## Decision

| Layer | Technology |
|---|---|
| **Monorepo** | pnpm 9 + turbo |
| **API** | NestJS 11 + Prisma 5 + Socket.IO 4 |
| **Mobile (iOS + Android)** | Expo + expo-router + NativeWind (custom dev client) |
| **Worker** | NestJS standalone + BullMQ consumer (push fanout; scaffolded when Phase 2 needs it) |
| **DB / cache+queue / object storage** | Postgres 16 / Redis 7 / MinIO — all plain containers (per ADR-0001 portability rules) |
| **Contracts** | `packages/contracts` — Zod schemas shared API ↔ mobile |
| **Crypto** | `packages/crypto` — the libsignal TS interface (ADR-0003) |
| **Language / runtime** | TypeScript strict everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) / Node.js 20 LTS |

**Messaging transport**: Socket.IO for chat/signaling; media over HTTP/MinIO (ADR-0008); calls over WebRTC (ADR-0005) — three separate transports, no overlap.

**Web version**: deferred (per product decision). When built (WhatsApp Web style), it is just another linked device (ADR-0006) using React + the shared `contracts`/`crypto` packages. Nothing in this stack precludes it.

Alternatives rejected: Elixir/Phoenix (WhatsApp's own lineage, but unknown to the team — velocity beats fanout elegance at this scale), Go backend (same reason), native Swift+Kotlin (two codebases double every feature), Flutter (previously abandoned by the team).

## Consequences

### Positive
- Team muscle memory, ADR precedent, deployment machinery, and agent docs all transfer from auto.tm-rewrite.
- Single language end-to-end; shared Zod contracts eliminate API drift.
- Every component is a boring container — satisfies ADR-0001 portability rules.

### Negative / accepted costs
- NestJS boilerplate (~30% over Hono/Fastify) — accepted for structure, same trade as auto.tm.
- Expo custom dev client slows the dev loop slightly — mandatory anyway for the crypto module (ADR-0003).

## References

- auto.tm-rewrite ADR-0002 (technology stack)
- Related here: ADR-0001 (hosting), ADR-0003 (crypto module), ADR-0005 (calls transport)
