import type { LocalDb } from "./types";

/**
 * Versioned, transactional migration runner (#47 prototype).
 *
 * Migrations are applied strictly in ascending `version` order. Each
 * migration runs inside its own transaction and stamps
 * `PRAGMA user_version = <version>` in the same transaction, so a failed
 * migration leaves the database exactly at the last good version.
 *
 * `user_version` survives backup/restore of the file itself and is readable
 * by every SQLite/SQLCipher engine, which keeps the storage engine
 * replaceable (ADR-0013 rollback requirement).
 */
export interface Migration {
  /** 1-based, must be unique and contiguous from 1. */
  version: number;
  name: string;
  /** DDL/DML statements applied in order inside one transaction. */
  statements: string[];
}

/**
 * Schema v1: durable message history and outbox (ADR-0012 sections 5–6).
 * Rows carry Signal ciphertext only (ADR-0003) — plaintext never touches
 * this database, which is why SQLCipher at rest plus SecureStore key
 * custody is sufficient for the threat model in ADR-0013.
 */
export const SCHEMA_MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "messages-and-outbox",
    statements: [
      `CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
        ciphertext BLOB NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
        server_seq INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX idx_messages_conversation
        ON messages (conversation_id, created_at)`,
      `CREATE TABLE outbox (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        ciphertext BLOB NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        retry_count INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX idx_outbox_drain_order
        ON outbox (next_attempt_at, created_at)`,
    ],
  },
];

export async function currentVersion(db: LocalDb): Promise<number> {
  const rows = await db.all<{ user_version: number }>("PRAGMA user_version");
  return rows[0]?.user_version ?? 0;
}

export async function migrate(
  db: LocalDb,
  migrations: Migration[] = SCHEMA_MIGRATIONS,
): Promise<number> {
  assertValidMigrations(migrations);
  const from = await currentVersion(db);
  const pending = migrations.filter((m) => m.version > from).sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    await db.transaction(async (tx) => {
      for (const statement of migration.statements) {
        await tx.exec(statement);
      }
      // PRAGMA cannot take bound parameters; version is a validated integer.
      await tx.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
  return currentVersion(db);
}

function assertValidMigrations(migrations: Migration[]): void {
  const versions = migrations.map((m) => m.version).sort((a, b) => a - b);
  versions.forEach((version, index) => {
    if (!Number.isInteger(version) || version < 1) {
      throw new Error(`Migration version must be a positive integer, got ${version}`);
    }
    if (index > 0 && version === versions[index - 1]) {
      throw new Error(`Duplicate migration version ${version}`);
    }
  });
}
