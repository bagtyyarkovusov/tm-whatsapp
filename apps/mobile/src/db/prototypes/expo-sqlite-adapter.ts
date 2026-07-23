/**
 * Prototype: expo-sqlite + SQLCipher (recommended engine, ADR-0013).
 *
 * Reproduction steps (custom dev client — never Expo Go, SQLCipher is
 * native-only):
 *   1. app.json: ["expo-sqlite", { "useSQLCipher": true }] plugin entry
 *      (already added in this branch) + `npx expo prebuild`.
 *   2. pnpm install; expo run:ios / expo run:android.
 *   3. Call openEncryptedDatabase(); assert a row round-trips and that
 *      opening the file with a wrong/absent PRAGMA key fails
 *      ("file is not a database").
 *
 * Key custody: a 256-bit random key is generated on first launch and stored
 * ONLY in platform secure storage (iOS Keychain / Android Keystore-backed
 * EncryptedSharedPreferences) with THIS_DEVICE_ONLY accessibility, so the
 * key never joins iCloud Keychain or Google backup. The ciphertext database
 * file without the key is unrecoverable — matching the ADR-0007 model that
 * message recovery goes through the E2EE backup flow, never OS backups.
 */
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";

import { migrate } from "../migrations";
import type { LocalDb, RunResult, SqlValue } from "../types";

const DB_NAME = "tm-messages.db";
const SECURE_STORE_KEY = "tm.db.key.v1";

export async function loadOrCreateDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (existing !== null) {
    return existing;
  }
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(SECURE_STORE_KEY, hex, {
    // Never sync the key off-device; an OS-backup-restored database is
    // unreadable by design (threat model, ADR-0013).
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return hex;
}

function wrap(db: SQLite.SQLiteDatabase): LocalDb {
  const local: LocalDb = {
    async exec(sql) {
      await db.execAsync(sql);
    },
    async run(sql, params = []): Promise<RunResult> {
      const result = await db.runAsync(sql, params as SQLite.SQLiteBindParams);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      return db.getAllAsync<T>(sql, params as SQLite.SQLiteBindParams);
    },
    async transaction<T>(fn: (tx: LocalDb) => Promise<T>): Promise<T> {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await fn(local);
      });
      return result;
    },
    async close() {
      await db.closeAsync();
    },
  };
  return local;
}

export async function openEncryptedDatabase(): Promise<LocalDb> {
  const key = await loadOrCreateDatabaseKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // SQLCipher: PRAGMA key must be the first statement on the connection.
  // The key is a locally generated hex string, so interpolation is safe
  // (PRAGMA does not accept bound parameters).
  await db.execAsync(`PRAGMA key = '${key}'`);
  // Fail fast if the key is wrong — SQLCipher defers errors to first read.
  await db.getFirstAsync("SELECT count(*) FROM sqlite_master");
  const local = wrap(db);
  await migrate(local);
  return local;
}
