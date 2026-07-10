import { useCallback, useEffect, useState } from "react";
import type { Category, RoundResult } from "../domain/types";
import { defaultSettings, type Settings } from "../domain/settings";
import {
  IdbCategoryRepository,
  getSetting,
  setSetting,
} from "../persistence/repositories";
import { dbReady } from "../startup";
import { applyTheme } from "./theme";

export async function categoryRepo(): Promise<IdbCategoryRepository> {
  return new IdbCategoryRepository(await dbReady);
}

/** null while loading */
export function useCategories() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const reload = useCallback(async () => {
    setCategories(await (await categoryRepo()).getAll());
  }, []);
  useEffect(() => void reload(), [reload]);
  return { categories, reload };
}

/** undefined while loading, null when not found */
export function useCategory(id: string) {
  const [category, setCategory] = useState<Category | null | undefined>(
    undefined,
  );
  useEffect(() => {
    void categoryRepo().then(async (repo) =>
      setCategory((await repo.get(id)) ?? null),
    );
  }, [id]);
  return category;
}

const SETTINGS_KEY = "settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void dbReady.then(async (db) => {
      const stored = await getSetting<Partial<Settings>>(db, SETTINGS_KEY);
      if (stored) setSettings({ ...defaultSettings, ...stored });
      setReady(true);
    });
  }, []);
  const update = useCallback(async (patch: Partial<Settings>) => {
    let next: Settings | undefined;
    setSettings((prev) => (next = { ...prev, ...patch }));
    if (patch.theme) applyTheme(patch.theme);
    await setSetting(await dbReady, SETTINGS_KEY, next);
  }, []);
  return { settings, update, ready };
}

// Last finished round, held for the results screen (with its history key so
// review-mode corrections update the stored copy).
let lastRound: { result: RoundResult; key: number } | null = null;

export function setLastRound(result: RoundResult, key: number): void {
  lastRound = { result, key };
}

export function getLastRound(): { result: RoundResult; key: number } | null {
  return lastRound;
}
