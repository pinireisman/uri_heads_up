import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Category, RoundResult } from "../domain/types";

export interface ImportBackup {
  at: string;
  categories: Category[];
}

export interface UhuSchema extends DBSchema {
  categories: { key: string; value: Category };
  settings: { key: string; value: unknown };
  rounds: { key: number; value: RoundResult };
  backups: { key: string; value: ImportBackup };
}

export type UhuDb = IDBPDatabase<UhuSchema>;

export const DB_VERSION = 1;

/** Migration ladder: each `if (oldVersion < n)` block upgrades to version n. */
export function openUhuDb(name = "uri_heads_up"): Promise<UhuDb> {
  return openDB<UhuSchema>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("categories", { keyPath: "id" });
        db.createObjectStore("settings");
        db.createObjectStore("rounds", { autoIncrement: true });
        db.createObjectStore("backups");
      }
    },
  });
}

let instance: Promise<UhuDb> | undefined;

export function getDb(): Promise<UhuDb> {
  instance ??= openUhuDb();
  return instance;
}
