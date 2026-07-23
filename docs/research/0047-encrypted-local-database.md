# Research 0047 — Encrypted local message database and migration strategy

- **Issue**: #47 (Mobile research: select encrypted local message database and migration strategy)
- **Date**: 2026-07-23
- **Author**: Sandcastle agent (Claude)
- **Resulting decision**: ADR-0013 (`docs/adr/0013-encrypted-local-database.md`)
- **Prototype code**: `apps/mobile/src/db/`

## 1. Problem statement

ADR-0012 fixes the mobile data architecture: durable message history and the
offline outbox live in an encrypted local SQLite store; TanStack Query holds
server state; private keys and the database key live in platform-secure
storage. ADR-0012 explicitly deferred the engine choice to this issue. The
database stores **Signal ciphertext only** (ADR-0003 encrypt-before-queue), so
the encryption-at-rest requirement is about defense in depth (device theft,
malware reading app-private files, forensic extraction), not about protecting
plaintext — plaintext never reaches this layer.

Settled constraints (from the issue):

- Candidates: `expo-sqlite`, `op-sqlite`, `react-native-quick-sqlite`.
- Encryption at rest is mandatory.
- Prototypes must exercise encryption, migration, backup exclusion, and CI
  testability.
- Key custody and backup-exclusion threat model must be explicit.

## 2. Candidate evaluation

All facts below were verified against primary sources on 2026-07-23 (Expo SDK
53–57 docs, op-sqlite GitHub docs at v17.1.2, margelo/react-native-quick-sqlite
README); links in section 7.

### 2.1 Maintenance and dev-client support

| Criterion | expo-sqlite 15.2 | op-sqlite 17.1 | react-native-quick-sqlite |
|---|---|---|---|
| Maintained by | Expo (first-party, ships with every SDK) | OP Engineering (Oscar Franco), active | **DEPRECATED** — repo reads "deprecated in favor of react-native-nitro-sqlite" |
| Custom dev client | Works in Expo Go unencrypted; SQLCipher requires prebuild/dev client (we already mandate dev client per ADR-0004) | Dev client / bare RN required | Dev client required |
| New Architecture | Yes | Yes (JSI HostObjects) | n/a |
| Docs quality | Excellent, versioned per SDK | Good, single-site | n/a |

`react-native-quick-sqlite` fails the "maintained library" bar outright and is
**eliminated without prototyping** — building a security-critical storage layer
on an abandoned dependency is not a defensible risk. Its two successors
(react-native-nitro-sqlite and op-sqlite) are noted in the ADR's rejected
alternatives.

### 2.2 iOS/Android encryption at rest

| | expo-sqlite | op-sqlite |
|---|---|---|
| Cipher | SQLCipher (full-database AES-256) | SQLCipher (optional build flag) |
| Enable | Config plugin: `["expo-sqlite", { "useSQLCipher": true }]` + prebuild | Root/package.json: `"op-sqlite": { "sqlcipher": true }` + prebuild |
| Key application | `PRAGMA key = '<key>'` as first statement after open | `encryptionKey` field on `open({...})` |
| Wrong-key behavior | Deferred error on first read (`file is not a database`) — fail-fast check required | Same SQLCipher semantics |

Both deliver identical cryptographic properties (same SQLCipher core). Both
prototypes (section 4) open with a key, run a fail-fast
`SELECT count(*) FROM sqlite_master`, then migrate.

### 2.3 SQL / transaction behavior

| | expo-sqlite | op-sqlite |
|---|---|---|
| Execution model | Async (`execAsync`, `runAsync`, `getAllAsync`) + sync variants | Sync-first (`executeSync`) + async (`execute`) |
| Transactions | `withTransactionAsync` / `withExclusiveTransactionAsync` | `db.transaction(fn)` with rollback on throw |
| Prepared statements | `prepareAsync` | `prepareStatement` + `loadFile` for SQL dumps |
| Extras | change listeners, FTS5/RTREE/dbstat flags via config plugin | reactive queries (update hook), FTS5/RTREE/CR-SQLite/libsql/sqlite-vec flags |

Both provide full SQLite semantics with transactional DDL — sufficient for the
versioned migration runner. op-sqlite's sync API is marginally better for hot
read paths (chat list rendering); expo-sqlite's async model integrates more
predictably with React effects. Neither difference is decisive for Phase 1
message volumes.

### 2.4 Migration and backup exclusion

Migrations: neither library ships an opinionated migrator, so this research
ships an engine-agnostic runner (`apps/mobile/src/db/migrations.ts`) keyed on
`PRAGMA user_version` — readable by every SQLite/SQLCipher engine, which keeps
the engine replaceable (rollback requirement). Each migration is one
transaction; a failed migration leaves the file at the last good version
(proven by test, section 4).

Backup exclusion:

| Platform | Mechanism | Status in this branch |
|---|---|---|
| Android | `android:allowBackup="false"` in the manifest via `expo-build-properties` config plugin (`app.json`) | Configured |
| Android SecureStore | expo-secure-store excludes its own SharedPreferences domain from Auto Backup automatically | Built into dependency |
| iOS database file | The DB must be excluded from iCloud device backups. expo-sqlite stores files under `Documents/SQLite/` by default, which iCloud backs up; exclusion requires setting `NSURLIsExcludedFromBackupKey` on the file after creation | Documented; a ~15-line config plugin / native call is a listed follow-up for the storage-adapter implementation issue (#39/#48 family) |
| iOS key | `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` keeps the key out of iCloud Keychain | In prototype |

Consequence of the custody design: an OS-backup-restored database is
**unreadable by design** (key never leaves the device), so excluding the file
is belt-and-braces against stale ciphertext copies accumulating in Apple/Google
clouds. Message recovery is the ADR-0007 E2EE backup flow, never OS backup.

### 2.5 Performance

- op-sqlite is the fastest RN SQLite binding in public benchmarks (author's
  benchmark: ~5x faster / ~5x less memory than quick-sqlite; PowerSync's
  independent comparison ranks it at the top) and is PowerSync's default engine.
- expo-sqlite 15 is a modern rewrite with JSI-class performance adequate for
  chat-scale workloads (tens of thousands of rows, indexed
  `conversation_id, created_at` scans).

Phase 1 message history (1:1 text, no media payloads in the DB) is far below
the threshold where the difference is user-visible. If profiling in #39/#48
shows chat-list queries missing frame budgets, the `LocalDb` interface plus
`user_version` migrations make switching engines a localized change.

### 2.6 Licensing

| | License | Cost |
|---|---|---|
| expo-sqlite | MIT | Free |
| op-sqlite | MIT | Free |
| SQLCipher | BSD-style (Zetetic) | Free for open-source and commercial use |
| expo-secure-store / expo-crypto | MIT | Free |

No licensing blockers for any candidate.

### 2.7 CI testability

| | expo-sqlite | op-sqlite |
|---|---|---|
| Engine-level tests in Node | No (native module) | Yes — sibling `@op-engineering/op-sqlite-node` runs the same API under Node |
| Schema/migration tests | Engine-agnostic SQL — tested against `node:sqlite` in this branch (8 tests) | Same |

op-sqlite's Node adapter is a genuine advantage. Mitigation for expo-sqlite:
all storage logic lives behind the `LocalDb` interface and is tested against
`node:sqlite` in CI (this branch), so only the thin adapter itself requires a
device — and that adapter is ~60 lines.

## 3. Decision summary

**Accepted: expo-sqlite 15 + SQLCipher** (`useSQLCipher` config plugin), key in
expo-secure-store, the migration runner and `LocalDb` interface from
`apps/mobile/src/db/`.

Rationale:

1. First-party Expo maintenance and per-SDK versioned docs — the stack is
   already Expo + custom dev client (ADR-0004), so SQLCipher adds zero new
   dependency vendors.
2. Cryptographic properties are identical to op-sqlite (same SQLCipher core);
   performance differences are immaterial at Phase 1 scale.
3. The CI-testability gap is closed by design (interface + node:sqlite), not
   by adding a second native dependency.
4. ADR-0012 named SQLCipher via expo-sqlite as the going-in recommendation;
   this research confirms it.

**Runner-up: op-sqlite** — retained as a working prototype and the documented
fallback if device profiling proves expo-sqlite insufficient.

**Rejected: react-native-quick-sqlite** — officially deprecated upstream.

## 4. Prototype evidence

All under `apps/mobile/src/db/`:

| Artifact | What it proves | How to reproduce |
|---|---|---|
| `types.ts` — `LocalDb` interface | Engine replaceability | — |
| `migrations.ts` + `migrations.test.ts` | Versioned transactional migrations; atomic rollback of failed migrations; duplicate-version guard; idempotency-key uniqueness; outbox drain ordering; multi-statement transaction rollback — 8 tests against Node's built-in SQLite | `pnpm --filter @tm/mobile test` |
| `prototypes/expo-sqlite-adapter.ts` | Encryption open sequence (`PRAGMA key` + fail-fast read), SecureStore key custody with THIS_DEVICE_ONLY, migration on open | Section 2.2/2.4 configs in `app.json`; `expo run:ios`/`expo run:android` on a device build (deferred — no devices in sandbox) |
| `prototypes/op-sqlite-adapter.ts` | Same sequence via `open({ encryptionKey })` and platform location constants | `"op-sqlite": { "sqlcipher": true }` already in `apps/mobile/package.json` |
| `app.json` | `useSQLCipher: true`, `allowBackup: false` | In branch |

Encryption itself (SQLCipher rejecting a wrong key) can only be executed on a
device build and is therefore documented as the reproduction steps inside each
prototype adapter; everything the sandbox can execute is executed and green.

## 5. Threat model: key custody and backup exclusion

Assets: local message history (Signal ciphertext), outbox (unsent ciphertext),
the SQLCipher database key.

| Threat | Mitigation |
|---|---|
| Device theft / forensic read of app sandbox | SQLCipher AES-256 full-database encryption; key never on disk — iOS Keychain / Android Keystore-backed EncryptedSharedPreferences via expo-secure-store |
| Key exfiltration via OS cloud sync | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (iOS) keeps the key out of iCloud Keychain; expo-secure-store auto-excludes its storage from Android Auto Backup |
| Stale ciphertext copies in iCloud/Google backups | Android `allowBackup=false` (configured); iOS `NSURLIsExcludedFromBackupKey` config plugin (follow-up). Even if a copy escapes, it is unreadable without the on-device key |
| Deleted-account residue | Account deletion (#—) wipes DB file + SecureStore item; encrypted file deletion is equivalent to crypto-erasure |
| Compromised device (rooted/jailbroken) | Out of scope — E2EE assumes endpoint compromise is catastrophic; SQLCipher addresses at-rest extraction, not live-memory attacks |
| Plaintext leakage into the DB | Schema stores ciphertext only (ADR-0003); content columns are BLOBs written after Signal encryption |

Key lifecycle: generated once (`Crypto.getRandomBytesAsync(32)`) on first
launch, 256-bit, hex-encoded into SecureStore; rotated only by wiping the
database (no re-key migration in Phase 1).

## 6. Migration strategy (accepted design)

- Ordered, uniquely-versioned migrations (`version: 1..N`), stored as code in
  the repo, applied at database open before any query runs.
- One transaction per migration; `PRAGMA user_version` stamped inside the same
  transaction — crash mid-migration leaves the previous version intact.
- Runner is idempotent and engine-agnostic (`LocalDb`), so engine swap
  (op-sqlite fallback) reuses every migration.
- No down-migrations in Phase 1; rollback is "delete and re-provision" because
  all content is re-fetchable ciphertext (history) or client-rebuildable
  (outbox) — consistent with the issue's replaceability requirement.

## 7. Primary sources

- Expo SQLite (SQLCipher config, PRAGMA key, storage locations):
  https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo SecureStore (Android Auto Backup exclusion, keychain accessibility):
  https://docs.expo.dev/versions/latest/sdk/securestore/
- op-sqlite API/configuration (encryptionKey, sqlcipher flag, location
  constants, Node adapter): https://github.com/OP-Engineering/op-sqlite
- react-native-quick-sqlite deprecation notice:
  https://github.com/margelo/react-native-quick-sqlite
- react-native-nitro-sqlite (official successor, noted):
  https://github.com/margelo/react-native-nitro-sqlite
- op-sqlite performance background: https://ospfranco.com/post/2023/11/09/sqlite-for-react-native,-but-5x-faster-and-5x-less-memory/
  and https://powersync.com/blog/react-native-database-performance-comparison
- SQLCipher license: https://github.com/sqlcipher/sqlcipher (BSD-style)
