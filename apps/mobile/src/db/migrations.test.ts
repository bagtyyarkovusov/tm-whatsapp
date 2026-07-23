import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

import { SCHEMA_MIGRATIONS, currentVersion, migrate, type Migration } from "./migrations";
import type { LocalDb, RunResult, SqlValue } from "./types";

/**
 * CI testability evidence for #47: the migration runner, transaction
 * semantics, and v1 schema are plain SQL over SQLite, so they are exercised
 * here against Node's built-in SQLite — no emulator, no device, no native
 * build. On-device engines (expo-sqlite/SQLCipher, op-sqlite/SQLCipher)
 * execute the same SQL; their prototype adapters live in ./prototypes.
 */
function createNodeDb(path = ":memory:"): LocalDb {
  const db = new DatabaseSync(path);
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params = []): Promise<RunResult> {
      const result = db.prepare(sql).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },
    async transaction<T>(fn: (tx: LocalDb) => Promise<T>): Promise<T> {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn(this);
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async close() {
      db.close();
    },
  };
}

describe("migration runner", () => {
  it("applies schema v1 and stamps user_version", async () => {
    const db = createNodeDb();
    const version = await migrate(db);
    expect(version).toBe(1);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(["messages", "outbox"]);
    await db.close();
  });

  it("is idempotent — a second migrate() applies nothing", async () => {
    const db = createNodeDb();
    await migrate(db);
    const again = await migrate(db);
    expect(again).toBe(1);
    expect(await currentVersion(db)).toBe(1);
    await db.close();
  });

  it("applies a v2 migration on top of an existing v1 database", async () => {
    const db = createNodeDb();
    await migrate(db);
    const v2: Migration = {
      version: 2,
      name: "add-reactions",
      statements: ["ALTER TABLE messages ADD COLUMN reaction TEXT"],
    };
    const version = await migrate(db, [...SCHEMA_MIGRATIONS, v2]);
    expect(version).toBe(2);
    const columns = await db.all<{ name: string }>("PRAGMA table_info(messages)");
    expect(columns.map((c) => c.name)).toContain("reaction");
    await db.close();
  });

  it("rolls back a failing migration atomically — no partial schema, version unchanged", async () => {
    const db = createNodeDb();
    const broken: Migration = {
      version: 1,
      name: "broken",
      statements: ["CREATE TABLE partial (id TEXT)", "INSERT INTO nonexistent_table VALUES (1)"],
    };
    await expect(migrate(db, [broken])).rejects.toThrow();
    expect(await currentVersion(db)).toBe(0);
    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    expect(tables).toEqual([]);
    await db.close();
  });

  it("rejects duplicate migration versions", async () => {
    const db = createNodeDb();
    const dup: Migration = { version: 1, name: "dup", statements: [] };
    await expect(migrate(db, [...SCHEMA_MIGRATIONS, dup])).rejects.toThrow(
      /Duplicate migration version/,
    );
    await db.close();
  });
});

describe("schema v1 semantics (outbox and history)", () => {
  it("stores ciphertext as BLOB and enforces the idempotency key", async () => {
    const db = createNodeDb();
    await migrate(db);
    const ciphertext = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const insert = async () =>
      db.run(
        "INSERT INTO outbox (id, conversation_id, ciphertext, idempotency_key, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        ["m1", "c1", ciphertext, "idem-1", 0, 1000],
      );
    await insert();
    // Same idempotency key must fail — the outbox processor relies on this
    // to make retries after app-kill safe (ADR-0012 section 6).
    await expect(insert()).rejects.toThrow();
    const rows = await db.all<{ ciphertext: Uint8Array }>(
      "SELECT ciphertext FROM outbox WHERE idempotency_key = ?",
      ["idem-1"],
    );
    expect(Buffer.from(rows[0]!.ciphertext)).toEqual(Buffer.from(ciphertext));
    await db.close();
  });

  it("drains the outbox in next_attempt_at order", async () => {
    const db = createNodeDb();
    await migrate(db);
    const insert = (id: string, nextAttemptAt: number) =>
      db.run(
        "INSERT INTO outbox (id, conversation_id, ciphertext, idempotency_key, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, "c1", new Uint8Array([1]), `idem-${id}`, nextAttemptAt, 1000],
      );
    await insert("late", 5000);
    await insert("soon", 100);
    await insert("now", 0);
    const due = await db.all<{ id: string }>(
      "SELECT id FROM outbox WHERE next_attempt_at <= ? ORDER BY next_attempt_at, created_at",
      [100],
    );
    expect(due.map((r) => r.id)).toEqual(["now", "soon"]);
    await db.close();
  });

  it("rolls back a multi-statement transaction on failure", async () => {
    const db = createNodeDb();
    await migrate(db);
    await expect(
      db.transaction(async (tx) => {
        await tx.run(
          "INSERT INTO messages (id, conversation_id, direction, ciphertext, created_at) VALUES (?, ?, ?, ?, ?)",
          ["m1", "c1", "out", new Uint8Array([1]), 1000],
        );
        throw new Error("simulated crash mid-transaction");
      }),
    ).rejects.toThrow("simulated crash");
    const rows = await db.all("SELECT id FROM messages");
    expect(rows).toEqual([]);
    await db.close();
  });
});
