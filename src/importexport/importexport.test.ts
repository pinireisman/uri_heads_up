import { describe, expect, test } from "vitest";
import {
  LIMITS,
  applyImport,
  exportCategories,
  parseImport,
} from "./importexport";
import type { Category } from "../domain/types";

const cat = (
  name: string,
  words: string[],
  id: string = crypto.randomUUID(),
): Category => ({
  id,
  name,
  description: "",
  icon: "",
  color: "",
  enabled: true,
  words: words.map((text) => ({
    id: crypto.randomUUID(),
    text,
    enabled: true,
  })),
});

describe("parseImport", () => {
  test("canonical format round-trips through export", () => {
    const json = exportCategories([cat("Animals", ["Giraffe", "Platypus"])]);
    const result = parseImport(json, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.categoryCount).toBe(1);
      expect(result.preview.wordCount).toBe(2);
      expect(result.preview.warnings).toEqual([]);
    }
  });

  test("simplified format: plain-string words", () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      categories: [
        { name: "Animals", words: ["Giraffe", "Platypus", "Elephant"] },
      ],
    });
    const result = parseImport(json, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const words = result.preview.categories[0]!.words;
      expect(words).toHaveLength(3);
      expect(words[0]).toMatchObject({ text: "Giraffe", enabled: true });
      expect(words[0]!.id).toBeTruthy();
    }
  });

  test.each([
    ["not json {", "invalid-json"],
    [JSON.stringify({ categories: [] }), "missing-version"],
    [JSON.stringify({ schemaVersion: 99, categories: [] }), "future-version"],
    [
      JSON.stringify({ schemaVersion: 1, categories: [{ words: [] }] }),
      "invalid",
    ],
    [
      JSON.stringify({
        schemaVersion: 1,
        categories: [{ name: "X", words: [1] }],
      }),
      "invalid",
    ],
    [JSON.stringify({ schemaVersion: 1, categories: "nope" }), "invalid"],
  ])("rejects bad input with the right code", (text, code) => {
    expect(parseImport(text, [])).toMatchObject({ ok: false, code });
  });

  test("rejects oversized files and overlong values", () => {
    expect(parseImport("x".repeat(LIMITS.fileBytes + 1), [])).toMatchObject({
      ok: false,
      code: "too-large",
    });
    const longWord = JSON.stringify({
      schemaVersion: 1,
      categories: [{ name: "X", words: ["y".repeat(LIMITS.wordLength + 1)] }],
    });
    expect(parseImport(longWord, [])).toMatchObject({
      ok: false,
      code: "invalid",
    });
  });

  test("dedupes words, drops empties, regenerates duplicate ids — with warnings", () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      categories: [
        { id: "same", name: "A", words: ["Dog", "dog ", "  ", "Cat"] },
        { id: "same", name: "B", words: ["Fish"] },
      ],
    });
    const result = parseImport(json, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.preview.categories[0]!.words.map((w) => w.text)).toEqual([
        "Dog",
        "Cat",
      ]);
      const codes = result.preview.warnings.map((w) => w.code).sort();
      expect(codes).toEqual([
        "duplicate-id-regenerated",
        "duplicate-words-removed",
        "empty-words",
      ]);
      expect(result.preview.categories[1]!.id).not.toBe("same");
    }
  });

  test("flags name collisions with existing categories", () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      categories: [{ name: "animals", words: ["Dog"] }],
    });
    const result = parseImport(json, [cat("Animals", ["Cat"])]);
    expect(result.ok && result.preview.duplicateNames).toEqual(["animals"]);
  });
});

describe("applyImport", () => {
  const existing = [
    cat("Animals", ["Dog", "Cat"], "ex1"),
    cat("Food", ["Pizza"], "ex2"),
  ];

  test("add appends everything as new", () => {
    const outcome = applyImport(existing, [cat("Animals", ["Fish"])], "add");
    expect(outcome.categories).toHaveLength(3);
    expect(outcome.addedCategories).toBe(1);
  });

  test("merge combines by name and dedupes words case-insensitively", () => {
    const outcome = applyImport(
      existing,
      [cat("animals", ["dog", "Fish"]), cat("Movies", ["Alien"])],
      "merge",
    );
    expect(outcome.categories).toHaveLength(3);
    expect(outcome.mergedCategories).toBe(1);
    expect(outcome.addedCategories).toBe(1);
    expect(outcome.addedWords).toBe(2); // Fish + Alien; "dog" already present
    const animals = outcome.categories.find((c) => c.name === "Animals")!;
    expect(animals.words.map((w) => w.text)).toEqual(["Dog", "Cat", "Fish"]);
    expect(existing[0]!.words).toHaveLength(2); // input untouched
  });

  test("replace returns only the incoming set", () => {
    const outcome = applyImport(
      existing,
      [cat("Movies", ["Alien"])],
      "replace",
    );
    expect(outcome.categories).toHaveLength(1);
    expect(outcome.categories[0]!.name).toBe("Movies");
  });
});

describe("exportCategories", () => {
  test("includes schema version and can filter disabled words", () => {
    const category = cat("Mixed", ["On", "Off"]);
    category.words[1]!.enabled = false;
    const full = JSON.parse(exportCategories([category]));
    expect(full.schemaVersion).toBe(1);
    expect(full.categories[0].words).toHaveLength(2);
    const filtered = JSON.parse(
      exportCategories([category], { onlyEnabledWords: true }),
    );
    expect(filtered.categories[0].words).toHaveLength(1);
  });
});
