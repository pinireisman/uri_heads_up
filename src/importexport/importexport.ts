import { z } from "zod";
import type { Category, Word } from "../domain/types";

export const SCHEMA_VERSION = 1;

// PRD FR-10 safety limits
export const LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  categories: 1000,
  wordsPerCategory: 10_000,
  wordLength: 200,
  categoryNameLength: 100,
};

// Accepts both the canonical format (word objects) and the simplified one
// (plain strings). Unknown keys are stripped; imported text is data, never HTML.
const wordSchema = z.union([
  z.string().max(LIMITS.wordLength),
  z.object({
    id: z.string().optional(),
    text: z.string().max(LIMITS.wordLength),
    enabled: z.boolean().optional(),
  }),
]);

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(LIMITS.categoryNameLength),
  description: z.string().max(500).optional(),
  icon: z.string().max(16).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .or(z.literal("")) // exports of categories without a color round-trip
    .optional(),
  enabled: z.boolean().optional(),
  words: z.array(wordSchema).max(LIMITS.wordsPerCategory),
});

const fileSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  categories: z.array(categorySchema).max(LIMITS.categories),
});

export type ImportErrorCode =
  | "too-large"
  | "invalid-json"
  | "missing-version"
  | "future-version"
  | "invalid";

export interface ImportWarning {
  code: "duplicate-words-removed" | "duplicate-id-regenerated" | "empty-words";
  category: string;
  count: number;
}

export interface ImportPreview {
  categories: Category[]; // normalized, ready to store
  categoryCount: number;
  wordCount: number;
  warnings: ImportWarning[];
  /** incoming category names that already exist locally (case-insensitive) */
  duplicateNames: string[];
}

export type ParseResult =
  | { ok: true; preview: ImportPreview }
  | { ok: false; code: ImportErrorCode; detail?: string };

export function parseImport(text: string, existing: Category[]): ParseResult {
  if (text.length > LIMITS.fileBytes) return { ok: false, code: "too-large" };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, code: "invalid-json" };
  }

  const version =
    typeof data === "object" && data !== null
      ? (data as Record<string, unknown>)["schemaVersion"]
      : undefined;
  if (version === undefined) return { ok: false, code: "missing-version" };
  if (typeof version === "number" && version > SCHEMA_VERSION) {
    return { ok: false, code: "future-version", detail: String(version) };
  }

  const parsed = fileSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      code: "invalid",
      detail: issue ? `${issue.path.join(".")}: ${issue.message}` : undefined,
    };
  }

  const warnings: ImportWarning[] = [];
  const seenIds = new Set<string>();
  const categories: Category[] = parsed.data.categories.map((raw) => {
    const seenWords = new Set<string>();
    let duplicateWords = 0;
    let emptyWords = 0;
    const words: Word[] = [];
    for (const w of raw.words) {
      const source = typeof w === "string" ? { text: w } : w;
      const text = source.text.trim();
      if (!text) {
        emptyWords++;
        continue;
      }
      const key = text.toLowerCase();
      if (seenWords.has(key)) {
        duplicateWords++;
        continue;
      }
      seenWords.add(key);
      words.push({
        id: uniqueId(typeof w === "string" ? undefined : w.id, seenIds),
        text,
        enabled: (typeof w === "string" ? undefined : w.enabled) ?? true,
      });
    }
    if (duplicateWords) {
      warnings.push({
        code: "duplicate-words-removed",
        category: raw.name,
        count: duplicateWords,
      });
    }
    if (emptyWords) {
      warnings.push({
        code: "empty-words",
        category: raw.name,
        count: emptyWords,
      });
    }
    const id = uniqueId(raw.id, seenIds, () =>
      warnings.push({
        code: "duplicate-id-regenerated",
        category: raw.name,
        count: 1,
      }),
    );
    return {
      id,
      name: raw.name,
      description: raw.description ?? "",
      icon: raw.icon ?? "",
      color: raw.color ?? "",
      enabled: raw.enabled ?? true,
      words,
    };
  });

  const existingNames = new Set(
    existing.map((c) => c.name.trim().toLowerCase()),
  );
  const duplicateNames = categories
    .filter((c) => existingNames.has(c.name.trim().toLowerCase()))
    .map((c) => c.name);

  return {
    ok: true,
    preview: {
      categories,
      categoryCount: categories.length,
      wordCount: categories.reduce((n, c) => n + c.words.length, 0),
      warnings,
      duplicateNames,
    },
  };
}

function uniqueId(
  candidate: string | undefined,
  seen: Set<string>,
  onDuplicate?: () => void,
): string {
  let id = candidate?.trim() || crypto.randomUUID();
  if (seen.has(id)) {
    onDuplicate?.();
    id = crypto.randomUUID();
  }
  seen.add(id);
  return id;
}

// --- strategies ---

export type ImportStrategy = "add" | "merge" | "replace";

export interface ImportOutcome {
  categories: Category[];
  addedCategories: number;
  mergedCategories: number;
  addedWords: number;
}

/** Pure: computes the post-import category list. Persistence (and the
 * pre-replace backup) is the caller's job. */
export function applyImport(
  existing: Category[],
  incoming: Category[],
  strategy: ImportStrategy,
): ImportOutcome {
  const totalWords = (cs: Category[]) =>
    cs.reduce((n, c) => n + c.words.length, 0);

  if (strategy === "replace") {
    return {
      categories: incoming,
      addedCategories: incoming.length,
      mergedCategories: 0,
      addedWords: totalWords(incoming),
    };
  }

  if (strategy === "add") {
    return {
      categories: [...existing, ...incoming],
      addedCategories: incoming.length,
      mergedCategories: 0,
      addedWords: totalWords(incoming),
    };
  }

  // merge: match by name (case-insensitive); append unseen words; keep
  // existing metadata; unmatched incoming categories become new.
  const result = existing.map((c) => structuredClone(c));
  const byName = new Map(result.map((c) => [c.name.trim().toLowerCase(), c]));
  let addedCategories = 0;
  let mergedCategories = 0;
  let addedWords = 0;
  for (const cat of incoming) {
    const target = byName.get(cat.name.trim().toLowerCase());
    if (!target) {
      result.push(cat);
      byName.set(cat.name.trim().toLowerCase(), cat);
      addedCategories++;
      addedWords += cat.words.length;
      continue;
    }
    mergedCategories++;
    const have = new Set(target.words.map((w) => w.text.trim().toLowerCase()));
    for (const word of cat.words) {
      if (have.has(word.text.trim().toLowerCase())) continue;
      have.add(word.text.trim().toLowerCase());
      target.words.push(word);
      addedWords++;
    }
  }
  return { categories: result, addedCategories, mergedCategories, addedWords };
}

// --- export ---

export function exportCategories(
  categories: Category[],
  options: { onlyEnabledWords?: boolean } = {},
): string {
  const out = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    categories: categories.map((c) => ({
      ...c,
      words: options.onlyEnabledWords
        ? c.words.filter((w) => w.enabled)
        : c.words,
    })),
  };
  return JSON.stringify(out, null, 2);
}
