/**
 * Engine-agnostic local database interface.
 *
 * Research prototype for #47 / ADR-0013: every candidate engine
 * (expo-sqlite + SQLCipher, op-sqlite + SQLCipher) is wrapped behind this
 * interface so the schema, migration runner, and outbox semantics are
 * identical across engines and testable in CI with node:sqlite.
 */

export type SqlValue = string | number | null | Uint8Array;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface LocalDb {
  /** Execute one or more semicolon-separated statements without results. */
  exec(sql: string): Promise<void>;
  /** Execute a single parameterized statement, returning affected-row info. */
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  /** Execute a parameterized query and return all rows. */
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /**
   * Run `fn` inside BEGIN IMMEDIATE / COMMIT. Any throw triggers ROLLBACK and
   * the error propagates — partial migrations must never persist.
   */
  transaction<T>(fn: (tx: LocalDb) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
