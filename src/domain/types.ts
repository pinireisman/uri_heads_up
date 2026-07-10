export interface Word {
  id: string;
  text: string;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or empty
  color: string; // #rrggbb or empty (UI default)
  enabled: boolean;
  /** play words in list order instead of shuffling */
  ordered?: boolean;
  words: Word[];
}

export type WordResult = "correct" | "skipped" | "unclassified";

export interface RoundOutcome {
  wordId: string;
  text: string;
  result: WordResult;
}

export interface RoundResult {
  categoryId: string;
  categoryName: string;
  startedAt: string;
  endedAt: string;
  /** first word shown → round end; absent on rounds saved before the timer existed */
  durationMs?: number;
  /** true when the deck was exhausted (vs ended manually) */
  completed?: boolean;
  outcomes: RoundOutcome[];
}

export function enabledWords(category: Category): Word[] {
  return category.words.filter((w) => w.enabled);
}
