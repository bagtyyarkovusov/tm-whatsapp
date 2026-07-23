# @tm/db

Prisma schema, migrations, and generated client for tm-whatsapp. The data
model is device-aware from day one (CONTEXT.md invariant #2, ADR-0006):
`Account → N Device → N PrekeyBundle/OneTimePrekey`, plus `OtpChallenge`,
`AuthSession` token families, and per-device `CiphertextMessage` queues.

## Privacy invariants (binding)

The schema must never gain columns that can hold:

- plaintext message bodies (only opaque `ciphertext` bytes);
- Signal private keys (only public key material: `identity_key_public`,
  `signed_prekey`, `signed_prekey_sig`, `one_time_prekeys.public_key`);
- cleartext OTP codes, refresh tokens, provisional credentials, or bootstrap
  secrets (hashes only: `code_hash`, `token_hash`, `installation_id_hash`,
  `activation_payload_hash`).

`src/schema.test.ts` enforces these invariants plus the ADR-0011 device
lifecycle fields at the schema level.

## Local development

Postgres 16 runs via the root `compose.yaml`. The service has no published
host port by default; use an override file to expose one locally:

```sh
docker compose -f compose.yaml -f <(printf 'services:\n  postgres:\n    ports:\n      - "127.0.0.1:55432:5432"\n') up -d postgres
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/tmwhatsapp?schema=public"
```

Then, from `packages/db`:

```sh
pnpm exec prisma migrate dev        # apply + evolve migrations
pnpm test                           # schema-level assertions (no DB needed)
```

## Rollback and forward-fix policy

- **Never destroy shared data automatically.** Destructive commands
  (`migrate reset`, manual `DROP`) are for local, disposable databases only.
- **Development:** `prisma migrate reset --force` drops, recreates, and
  reapplies all migrations. Safe only against your own local Postgres.
- **Shared/deployed environments:** forward-fix only. A bad migration is
  corrected by a new migration, never by editing or deleting an applied one.
  If migration state itself is corrupted, repair it explicitly with
  `prisma migrate resolve --applied|--rolled-back <name>` and record what was
  done in the pull request.
- **Verification:** `prisma migrate status` must report
  `Database schema is up to date!` with no pending or failed migrations
  before any merge or deploy.

## Migration health query

`prisma migrate status` is the canonical check. For a direct SQL health view
(e.g. from an operator console), inspect the migrations table:

```sql
SELECT migration_name, finished_at, rolled_back_at, logs
FROM "_prisma_migrations"
ORDER BY started_at;
```

Healthy state: every row has a non-null `finished_at` and a null
`rolled_back_at`. A row with `finished_at IS NULL AND rolled_back_at IS NULL`
is a failed migration and must be resolved before proceeding.
