import { getDb, type UhuDb } from "./persistence/db";
import { seedIfNeeded } from "./persistence/seed";
import { getSetting } from "./persistence/repositories";
import { defaultSettings, type Settings } from "./domain/settings";
import { applyTheme } from "./ui/theme";

/** Pages await this instead of getDb() so the demo seed can't race first reads. */
export const dbReady: Promise<UhuDb> = getDb().then(async (db) => {
  await seedIfNeeded(db);
  const stored = await getSetting<Partial<Settings>>(db, "settings");
  applyTheme(stored?.theme ?? defaultSettings.theme);
  return db;
});
