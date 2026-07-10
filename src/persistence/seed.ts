import type { Category } from "../domain/types";
import type { UhuDb } from "./db";
import { getSetting, setSetting, IdbCategoryRepository } from "./repositories";

const words = (texts: string[]) =>
  texts.map((text) => ({ id: crypto.randomUUID(), text, enabled: true }));

/** Original generic demo content (PRD Q16), one category per UI language. */
export function demoCategories(): Category[] {
  return [
    {
      id: crypto.randomUUID(),
      name: "Animals",
      description: "A small demo deck — edit or delete it freely",
      icon: "🦒",
      color: "#4f7cac",
      enabled: true,
      words: words([
        "Giraffe",
        "Elephant",
        "Penguin",
        "Kangaroo",
        "Dolphin",
        "Octopus",
        "Butterfly",
        "Crocodile",
        "Owl",
        "Zebra",
        "Hedgehog",
        "Whale",
        "Flamingo",
        "Squirrel",
        "Camel",
      ]),
    },
    {
      id: crypto.randomUUID(),
      name: "חיות",
      description: "חבילת הדגמה קטנה — אפשר לערוך או למחוק",
      icon: "🐘",
      color: "#4f9c6b",
      enabled: true,
      words: words([
        "ג'ירפה",
        "פיל",
        "פינגווין",
        "קנגורו",
        "דולפין",
        "תמנון",
        "פרפר",
        "תנין",
        "ינשוף",
        "זברה",
        "קיפוד",
        "לווייתן",
        "פלמינגו",
        "סנאי",
        "גמל",
      ]),
    },
  ];
}

/** Seed once per install; a user who deletes everything stays empty. */
export async function seedIfNeeded(db: UhuDb): Promise<void> {
  if (await getSetting<boolean>(db, "seeded")) return;
  const repo = new IdbCategoryRepository(db);
  if ((await repo.getAll()).length === 0) {
    await repo.putMany(demoCategories());
  }
  await setSetting(db, "seeded", true);
}
