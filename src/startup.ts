import { getDb, type UhuDb } from "./persistence/db";
import { seedIfNeeded } from "./persistence/seed";

/** Pages await this instead of getDb() so the demo seed can't race first reads. */
export const dbReady: Promise<UhuDb> = getDb().then(async (db) => {
  await seedIfNeeded(db);
  return db;
});
