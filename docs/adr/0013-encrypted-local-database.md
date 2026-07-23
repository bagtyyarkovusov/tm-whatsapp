# ADR-0013: Encrypted local database — expo-sqlite + SQLCipher, SecureStore key custody, user_version migrations

- **Status**: Accepted
- **Date**: 2026-07-23
- **Deciders**: bagtyyar + Claude (research-led selection per #47; grilling pre-approved)
- **Evidence**: `docs/research/0047-encrypted-local-database.md`, prototypes in `apps/mobile/src/db/`

## Context

ADR-0012 (section 5) made encrypted local SQLite the durable layer for message
history and the outbox but deferred the engine choice to #47. The database
holds Signal ciphertext only (ADR-0003); encryption at rest defends against
device theft and forensic extraction of app-private files. The engine must
support a custom Expo dev client (ADR-0004), full-database encryption on iOS
and Android, transactional DDL for migrations, exclusion from OS backups, and
CI-testable schema logic, under a permissive license.

## Decision

1. **Engine: expo-sqlite 15 with SQLCipher**, enabled via the config plugin
   `["expo-sqlite", { "useSQLCipher": true }]` (already in `apps/mobile/app.json`).
   The database is opened with `PRAGMA key` as the first statement, followed
   by a fail-fast read (`SELECT count(*) FROM sqlite_master`) so a wrong key
   fails at open, not mid-session.

2. **Key custody: expo-secure-store only.** A 256-bit key is generated with
   `expo-crypto` on first launch and stored in the iOS Keychain /
   Keystore-backed EncryptedSharedPreferences with
   `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. The key is never written to the database
   file, AsyncStorage, or the JS bundle, and never syncs off-device. There is
   no passphrase derivation and no re-key flow in Phase 1; rotation means
   wiping the database.

3. **Backup exclusion.** Android Auto Backup is disabled
   (`expo-build-properties` `android.allowBackup=false`). On iOS the database
   file must be excluded from iCloud backup with `NSURLIsExcludedFromBackupKey`
   (small config plugin — follow-up in the storage-adapter issue). This is
   belt-and-braces: an OS-backup-restored file is unreadable anyway because
   the key never leaves the device. Message recovery goes through the ADR-0007
   E2EE backup flow, never OS backup.

4. **Migrations: engine-agnostic runner on `PRAGMA user_version`.** Migrations
   are ordered, uniquely versioned, applied one transaction each at database
   open, with the version stamp inside the same transaction (atomic rollback
   on failure — proven in `migrations.test.ts`). No down-migrations; rollback
   is delete-and-re-provision because all content is re-fetchable ciphertext.
   All storage code sits behind the `LocalDb` interface
   (`apps/mobile/src/db/types.ts`) and is tested in CI against `node:sqlite`.

## Rejected alternatives

- **op-sqlite (runner-up, prototyped)** — faster in public benchmarks and has a
  Node adapter for engine-level CI tests, but adds a third-party native vendor
  for cryptographic properties identical to expo-sqlite (same SQLCipher core).
  Retained as the documented fallback: if device profiling during #39/#48
  shows chat-list queries missing frame budgets, the `LocalDb` interface and
  `user_version` migrations make the swap localized.
- **react-native-quick-sqlite** — officially deprecated upstream in favor of
  react-native-nitro-sqlite; disqualified on maintenance.
- **react-native-nitro-sqlite** — not among the settled candidates; noted only
  as quick-sqlite's successor.
- **WatermelonDB / Realm** — object-sync databases with their own storage
  engines and no first-class SQLCipher story for our schema; the ADR-0012
  architecture wants a plain SQL store behind TanStack Query, not a reactive
  ORM layer.
- **Key derivation from a user passphrase** — Phase 1 has no user passphrase
  (OTP auth, ADR-0009); device-bound random keys match the custody model of
  the Signal identity keys (ADR-0003).

## Consequences

### Positive

- No new dependency vendor: expo-sqlite, expo-secure-store, expo-crypto, and
  expo-build-properties are all first-party Expo packages tracked per SDK.
- Key custody and backup exclusion make OS-level copies of the database
  worthless, matching the E2EE threat model.
- Schema and migration logic are fully covered in CI without a device or
  emulator (8 tests, `pnpm --filter @tm/mobile test`).
- Engine swap cost is bounded by the `LocalDb` interface (~60-line adapter).

### Negative / accepted costs

- expo-sqlite cannot run engine-level tests in Node; only the adapter is
  device-only code.
- SQLCipher is unavailable in Expo Go — irrelevant, since ADR-0004 already
  mandates a custom dev client.
- The iOS `NSURLIsExcludedFromBackupKey` config plugin remains as a small
  follow-up task for the storage-adapter implementation issue.

## References

- `docs/research/0047-encrypted-local-database.md` (full comparison, threat
  model, primary sources)
- Prototypes: `apps/mobile/src/db/` (`types.ts`, `migrations.ts`,
  `migrations.test.ts`, `prototypes/expo-sqlite-adapter.ts`,
  `prototypes/op-sqlite-adapter.ts`)
- ADR-0003 (encrypt-before-queue), ADR-0004 (Expo dev client), ADR-0007 (E2EE
  backups), ADR-0012 (durable layer and outbox)
- Expo SQLite SQLCipher docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
