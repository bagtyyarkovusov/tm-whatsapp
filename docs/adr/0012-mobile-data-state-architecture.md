# ADR-0012: Mobile data and state architecture

- **Status**: Accepted
- **Date**: 2026-07-22
- **Deciders**: bagtyyar + Claude

## Context

The mobile client is the primary UX surface for Phase 1. It must keep server-state, client-state, ephemeral UI, durable local history, and an offline outbox clearly separated or the team will relitigate boundaries in every feature issue. This ADR records the eight decisions from the 2026-07-22 grilling session so that #39 (mobile chat implementation), #47 (encrypted local store engine), and #48–#53 (outbox/send/receive plumbing) can reference them directly.

## Decision

### 1. TanStack Query v5 is the single server-state cache

All server-derived state lives in TanStack Query v5. No other store caches API responses.

- One module-scope `QueryClient` is created in the root layout and passed through the React Query provider tree.
- Hierarchical, per-feature `queryKeys.ts` files centralize cache keys. A key encodes the feature, identity scope, and any parameters so that targeted invalidation is explicit and searchable.
- Per-feature hooks (`useMessages`, `useSendMessage`, `useContacts`, etc.) are the only places components access server state.
- A hand-rolled fetch wrapper is used instead of a generated client. Every response is run through the shared Zod contract in `packages/contracts` with `safeParse`. A parse failure is treated as a `CONTRACT_VIOLATION` and reported (anonymized) so that API drift is caught immediately.
- Mutations invalidate or set related queries through the same `queryClient` instance; components do not perform ad-hoc cache updates.

### 2. Socket.IO events are cache mutators

Socket.IO carries chat/signaling traffic per ADR-0004. Socket events never become a separate source of truth; they mutate the TanStack Query cache.

- Incoming events update the cache with `queryClient.setQueryData` for known query keys.
- Events that may affect multiple keys trigger targeted `invalidateQueries` so the next render refetches fresh server state.
- Cache shapes written from sockets are typed by the same `packages/contracts` schemas used for HTTP. There are no `as` casts in socket cache writers.
- On reconnect, the client runs invalidation for the active conversation/contact list so any events missed while disconnected are recovered via HTTP.

### 3. Zustand is client-only state

Zustand stores client-owned state that is not derived from the server.

Examples: auth session metadata, theme, locale, active call state, composer draft pointers.

Server data stored in Zustand is a review failure. If a value can be reconstructed from a TanStack Query cache entry, it does not belong in Zustand.

### 4. `useState` holds ephemeral UI state

Component-local state holds UI that is transient and does not need to survive unmount.

Examples: typing indicator pulse, presence animation, expanded attachment picker, current scroll position.

Ephemeral UI state is never promoted to a global store.

### 5. Encrypted local SQLite is the durable layer

Message history and the outbox live in durable, encrypted local storage.

- The local store is the source of truth for offline message history. TanStack Query reads from the server; the local store reads from disk. The UI reconciles both layers through feature hooks.
- On app start, the local store hydrates relevant TanStack Query cache entries so the UI shows data before the first network round-trip.
- The engine selection remains with #47. SQLCipher via `expo-sqlite` is the recommendation going in, but the ADR is storage-agnostic: any encrypted SQLite engine that supports the schema and key lifecycle in #47 is acceptable.
- Private keys, refresh tokens, and the local database key live in platform-secure storage, not in the database file.

### 6. Outbox

Unsent ciphertext messages are stored in a local SQLite outbox table and pushed through TanStack mutations.

- Outbox rows contain ciphertext (already encrypted per ADR-0003), delivery metadata, retry count, and idempotency key.
- An outbox processor drains the table in order: it calls the appropriate TanStack mutation, updates the local history on success, and retries with exponential backoff on transient failures.
- A message is not removed from the outbox until the server acknowledges receipt.
- The outbox is durable across app kills and restarts.

### 7. Documented agent traps

The following behaviors are deliberate and must not be "cleaned up" by future agents without reopening this ADR:

- **React Native `AbortController` does not reliably cancel fetch.** The mobile fetch wrapper uses `Promise.race` against a timeout promise instead of relying on `AbortController`.
- **NetInfo's `isInternetReachable` can be `null`.** A null value means reachability is unknown, not offline. Unknown-reachable is treated as online; only explicit `false` is treated as offline.
- **No Redux or MobX.** Both were rejected: they duplicate TanStack Query's server-state role and carry no team muscle memory.
- **No server-side message history.** The Postgres database stays message-agnostic after delivery, per ADR-0004. The server relays ciphertext; local history is the only history.

### 8. Scope statement

This ADR is mobile-first. The deferred web client (ADR-0004/ADR-0006) inherits the same pattern when it is built.

## Rejected alternatives

- **Redux / Redux Toolkit for server state** — rejected: boilerplate exceeds value for a small team and duplicates TanStack Query.
- **MobX** — rejected: no existing team experience; implicit reactivity obscures cache invalidation.
- **Server-side message retention for sync** — rejected: contradicts the server-never-sees-plaintext invariant and ADR-0004.
- **Encrypted local store as the only data layer** — rejected: TanStack Query is still required for online recovery, conflict resolution, and multi-device fanout.

## Consequences

### Positive

- A single, strongly typed server-state cache eliminates drift between HTTP and socket data.
- Durable local storage plus an ordered outbox gives true offline sending and recovery after app kills.
- Clear layer boundaries make future features faster: pick the right store, implement, done.
- Agent traps are explicit, so future Sandcastle agents do not accidentally break offline behavior or socket recovery.

### Negative / accepted costs

- More moving parts than a single global store: components may need to reconcile TanStack Query state with local SQLite state.
- SQLCipher/engine selection is still a research issue (#47); this ADR does not make that choice.
- The outbox processor must handle duplicate sends, retries, and TanStack mutation lifecycle carefully.

## References

- `CONTEXT.md` glossary (Account, Device, Auth session, Signal session, Ciphertext message)
- ADR-0003 (E2EE Signal Protocol — encrypt-before-queue)
- ADR-0004 (technology stack and clone-auto.tm principle)
- ADR-0006 (multi-device model)
- ADR-0009 (SMS OTP auth and per-device sessions)
- ADR-0011 (provisional Device activation)
- `docs/prd/01-roadmap.md` (Phase 1 offline queue requirement)
- `docs/prd/02-phase-1-execution.md` (Wave 3 outbox and transport)
