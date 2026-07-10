import type { Category, RoundResult } from "../domain/types";
import type { ImportBackup, UhuDb } from "./db";
import {
  applyImport,
  type ImportOutcome,
  type ImportStrategy,
} from "../importexport/importexport";

/** UI and domain code go through this interface, never IndexedDB directly. */
export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  get(id: string): Promise<Category | undefined>;
  put(category: Category): Promise<void>;
  putMany(categories: Category[]): Promise<void>; // transactional
  delete(id: string): Promise<void>;
  replaceAll(categories: Category[]): Promise<void>; // transactional
}

export class IdbCategoryRepository implements CategoryRepository {
  private db: UhuDb;

  constructor(db: UhuDb) {
    this.db = db;
  }

  getAll(): Promise<Category[]> {
    return this.db.getAll("categories");
  }

  get(id: string): Promise<Category | undefined> {
    return this.db.get("categories", id);
  }

  async put(category: Category): Promise<void> {
    await this.db.put("categories", category);
  }

  async putMany(categories: Category[]): Promise<void> {
    const tx = this.db.transaction("categories", "readwrite");
    // A sync put error (e.g. unclonable value) does NOT auto-abort the
    // transaction — already-queued puts would still commit. Abort explicitly.
    try {
      // per-put rejections surface via tx.done; silence them individually
      categories.forEach((c) => void tx.store.put(c).catch(() => {}));
    } catch (error) {
      tx.done.catch(() => {}); // abort makes done reject; the throw below is the real error
      tx.abort();
      throw error;
    }
    await tx.done;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete("categories", id);
  }

  async replaceAll(categories: Category[]): Promise<void> {
    const tx = this.db.transaction("categories", "readwrite");
    try {
      void tx.store.clear().catch(() => {});
      categories.forEach((c) => void tx.store.put(c).catch(() => {}));
    } catch (error) {
      tx.done.catch(() => {});
      tx.abort();
      throw error;
    }
    await tx.done;
  }
}

/** Test double; structuredClone mimics IndexedDB's value isolation. */
export class InMemoryCategoryRepository implements CategoryRepository {
  private items = new Map<string, Category>();

  async getAll(): Promise<Category[]> {
    return [...this.items.values()].map((c) => structuredClone(c));
  }

  async get(id: string): Promise<Category | undefined> {
    const item = this.items.get(id);
    return item && structuredClone(item);
  }

  async put(category: Category): Promise<void> {
    this.items.set(category.id, structuredClone(category));
  }

  async putMany(categories: Category[]): Promise<void> {
    for (const c of categories) await this.put(c);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async replaceAll(categories: Category[]): Promise<void> {
    this.items.clear();
    await this.putMany(categories);
  }
}

// --- settings: flat key/value ---

export async function getSetting<T>(
  db: UhuDb,
  key: string,
): Promise<T | undefined> {
  return (await db.get("settings", key)) as T | undefined;
}

export async function setSetting(
  db: UhuDb,
  key: string,
  value: unknown,
): Promise<void> {
  await db.put("settings", value, key);
}

// --- round history (PRD Q15: keep the most recent 20) ---

export const HISTORY_LIMIT = 20;

export async function addRound(db: UhuDb, result: RoundResult): Promise<void> {
  const tx = db.transaction("rounds", "readwrite");
  void tx.store.add(result);
  const keys = await tx.store.getAllKeys(); // runs after the add: includes it
  for (const key of keys.slice(0, Math.max(0, keys.length - HISTORY_LIMIT))) {
    void tx.store.delete(key);
  }
  await tx.done;
}

export async function getRounds(db: UhuDb): Promise<RoundResult[]> {
  return (await db.getAll("rounds")).reverse(); // newest first
}

export async function clearRounds(db: UhuDb): Promise<void> {
  await db.clear("rounds");
}

// --- import backup (single slot, overwritten by each replace-import) ---

const BACKUP_KEY = "lastImportBackup";

export async function saveBackup(
  db: UhuDb,
  categories: Category[],
): Promise<void> {
  await db.put(
    "backups",
    { at: new Date().toISOString(), categories },
    BACKUP_KEY,
  );
}

export async function getBackup(db: UhuDb): Promise<ImportBackup | undefined> {
  return db.get("backups", BACKUP_KEY);
}

// --- import execution (PRD §10.3: preview → strategy → transactional write) ---

export async function executeImport(
  db: UhuDb,
  incoming: Category[],
  strategy: ImportStrategy,
): Promise<ImportOutcome> {
  const repo = new IdbCategoryRepository(db);
  const existing = await repo.getAll();
  if (strategy === "replace") await saveBackup(db, existing); // recoverable
  const outcome = applyImport(existing, incoming, strategy);
  await repo.replaceAll(outcome.categories); // single transaction: all or nothing
  return outcome;
}

export async function restoreBackup(db: UhuDb): Promise<boolean> {
  const backup = await getBackup(db);
  if (!backup) return false;
  await new IdbCategoryRepository(db).replaceAll(backup.categories);
  return true;
}
