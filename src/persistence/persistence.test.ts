import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "vitest";
import { openUhuDb, type UhuDb } from "./db";
import {
  HISTORY_LIMIT,
  IdbCategoryRepository,
  addRound,
  executeImport,
  getBackup,
  getRounds,
  getSetting,
  restoreBackup,
  setSetting,
} from "./repositories";
import { demoCategories, seedIfNeeded } from "./seed";
import type { Category, RoundResult } from "../domain/types";

let db: UhuDb;
let dbCounter = 0;

beforeEach(async () => {
  db = await openUhuDb(`test-${++dbCounter}`); // fresh db per test
});

const cat = (name: string): Category => ({
  id: crypto.randomUUID(),
  name,
  description: "",
  icon: "",
  color: "",
  enabled: true,
  words: [{ id: crypto.randomUUID(), text: "Word", enabled: true }],
});

describe("IdbCategoryRepository", () => {
  test("crud round-trip", async () => {
    const repo = new IdbCategoryRepository(db);
    const a = cat("A");
    await repo.put(a);
    expect((await repo.get(a.id))?.name).toBe("A");
    await repo.put({ ...a, name: "A2" });
    expect(await repo.getAll()).toHaveLength(1);
    await repo.delete(a.id);
    expect(await repo.getAll()).toHaveLength(0);
  });

  test("a failing putMany rolls back the whole transaction", async () => {
    const repo = new IdbCategoryRepository(db);
    await repo.put(cat("Existing"));
    const good = cat("Good");
    const bad = { ...cat("Bad"), poison: () => {} } as unknown as Category; // functions can't be cloned
    await expect(repo.putMany([good, bad])).rejects.toThrow();
    const names = (await repo.getAll()).map((c) => c.name);
    expect(names).toEqual(["Existing"]); // nothing from the batch landed
  });

  test("replaceAll is atomic", async () => {
    const repo = new IdbCategoryRepository(db);
    await repo.putMany([cat("A"), cat("B")]);
    await repo.replaceAll([cat("C")]);
    expect((await repo.getAll()).map((c) => c.name)).toEqual(["C"]);
  });
});

describe("settings and history", () => {
  test("settings round-trip", async () => {
    expect(await getSetting(db, "x")).toBeUndefined();
    await setSetting(db, "x", { nested: true });
    expect(await getSetting(db, "x")).toEqual({ nested: true });
  });

  test("history keeps only the newest rounds", async () => {
    const round = (n: number): RoundResult => ({
      categoryId: "c",
      categoryName: `Round ${n}`,
      startedAt: "",
      endedAt: "",
      outcomes: [],
    });
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) await addRound(db, round(i));
    const rounds = await getRounds(db);
    expect(rounds).toHaveLength(HISTORY_LIMIT);
    expect(rounds[0]?.categoryName).toBe(`Round ${HISTORY_LIMIT + 4}`); // newest first
  });
});

describe("executeImport", () => {
  test("replace saves a recoverable backup first", async () => {
    const repo = new IdbCategoryRepository(db);
    await repo.put(cat("Original"));
    await executeImport(db, [cat("Imported")], "replace");
    expect((await repo.getAll()).map((c) => c.name)).toEqual(["Imported"]);
    expect((await getBackup(db))?.categories.map((c) => c.name)).toEqual([
      "Original",
    ]);
    expect(await restoreBackup(db)).toBe(true);
    expect((await repo.getAll()).map((c) => c.name)).toEqual(["Original"]);
  });

  test("merge import persists merged result without a backup", async () => {
    const repo = new IdbCategoryRepository(db);
    await repo.put(cat("Animals"));
    const outcome = await executeImport(
      db,
      [cat("Animals"), cat("Movies")],
      "merge",
    );
    expect(outcome.mergedCategories).toBe(1);
    expect(await repo.getAll()).toHaveLength(2);
    expect(await getBackup(db)).toBeUndefined();
  });
});

describe("seed", () => {
  test("seeds demo categories once, and never re-seeds after deletion", async () => {
    await seedIfNeeded(db);
    const repo = new IdbCategoryRepository(db);
    expect(await repo.getAll()).toHaveLength(demoCategories().length);
    await repo.replaceAll([]);
    await seedIfNeeded(db);
    expect(await repo.getAll()).toHaveLength(0);
  });
});
