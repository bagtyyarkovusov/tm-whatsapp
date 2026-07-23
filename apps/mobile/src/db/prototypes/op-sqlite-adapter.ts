/**
 * Prototype: op-sqlite + SQLCipher (runner-up engine, ADR-0013).
 *
 * Reproduction steps:
 *   1. apps/mobile/package.json already carries `"op-sqlite": { "sqlcipher": true }`
 *      (build-time flag read by the op-sqlite Gradle/CocoaPods scripts).
 *   2. pnpm install; npx expo prebuild; expo run:ios / expo run:android.
 *   3. Call openEncryptedDatabase(); same wrong-key failure check as the
 *      expo-sqlite prototype.
 *
 * CI note (a real op-sqlite advantage): the sibling package
 * `@op-engineering/op-sqlite-node` runs the same API under Node, so
 * engine-level integration tests could run without an emulator. We still
 * rejected it — see docs/research/0047-encrypted-local-database.md.
 *
 * Key custody is identical to the expo-sqlite prototype: the encryption key
 * lives only in expo-secure-store with THIS_DEVICE_ONLY accessibility.
 */
import {
  ANDROID_DATABASE_PATH,
  IOS_LIBRARY_PATH,
  open,
  type DB,
  type QueryResult,
} from "@op-engineering/op-sqlite";
import { Platform } from "react-native";

import { loadOrCreateDatabaseKey } from "./expo-sqlite-adapter";
import { migrate } from "../migrations";
import type { LocalDb, RunResult, SqlValue } from "../types";

const DB_NAME = "tm-messages";

function toParams(params: SqlValue[]): (string | number | null | ArrayBuffer)[] {
  return params.map((p) => {
    if (!(p instanceof Uint8Array)) {
      return p;
    }
    const copy = new Uint8Array(p.byteLength);
    copy.set(p);
    return copy.buffer;
  });
}

function wrap(db: DB): LocalDb {
  const local: LocalDb = {
    async exec(sql) {
      await db.execute(sql);
    },
    async run(sql, params = []): Promise<RunResult> {
      const result: QueryResult = await db.execute(sql, toParams(params));
      return {
        changes: result.rowsAffected ?? 0,
        lastInsertRowId: result.insertId ?? 0,
      };
    },
    async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      const result = await db.execute(sql, toParams(params));
      return (result.rows ?? []) as T[];
    },
    async transaction<T>(fn: (tx: LocalDb) => Promise<T>): Promise<T> {
      let result!: T;
      await db.transaction(async () => {
        result = await fn(local);
      });
      return result;
    },
    async close() {
      await db.close();
    },
  };
  return local;
}

export async function openEncryptedDatabase(): Promise<LocalDb> {
  const key = await loadOrCreateDatabaseKey();
  // iOS Library and Android databases dir are both app-private. OS backup
  // exclusion is handled the same way as the expo-sqlite prototype
  // (android.allowBackup=false; iOS NSURLIsExcludedFromBackupKey config
  // plugin) — a restored file without the SecureStore key is unreadable.
  const db = open({
    name: DB_NAME,
    encryptionKey: key,
    location: Platform.OS === "ios" ? IOS_LIBRARY_PATH : ANDROID_DATABASE_PATH,
  });
  // Fail fast on a wrong key before any migration runs.
  await db.execute("SELECT count(*) FROM sqlite_master");
  const local = wrap(db);
  await migrate(local);
  return local;
}
