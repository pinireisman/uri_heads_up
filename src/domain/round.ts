import {
  enabledWords,
  type Category,
  type RoundOutcome,
  type RoundResult,
  type Word,
  type WordResult,
} from "./types";

/**
 * Owns one round: shuffled deck of enabled words, no repeats, exhaustion,
 * scoring. Pure domain — no sensors, no storage, no timers beyond Date for
 * result stamps. Gestures and touch buttons both call `classify`.
 */
export class Round {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly startedAt = new Date().toISOString();
  private deck: Word[];
  private outcomes: RoundOutcome[] = [];

  constructor(
    category: Category,
    random: () => number = Math.random,
    limit = 0, // 0 = whole deck
  ) {
    this.categoryId = category.id;
    this.categoryName = category.name;
    const deck = shuffle(enabledWords(category), random);
    this.deck = limit > 0 ? deck.slice(0, limit) : deck;
  }

  /** null once the deck is exhausted ("Deck complete"). */
  get current(): Word | null {
    return this.deck[this.outcomes.length] ?? null;
  }

  /** Words shown so far, including the one on screen. */
  get presented(): number {
    return this.outcomes.length + (this.current ? 1 : 0);
  }

  get isComplete(): boolean {
    return this.current === null;
  }

  classify(result: "correct" | "skipped"): void {
    const word = this.current;
    if (!word) return; // deck exhausted: ignore
    this.outcomes.push({ wordId: word.id, text: word.text, result });
  }

  /** End now; a word still on screen is recorded as unclassified. */
  end(): RoundResult {
    const outcomes = [...this.outcomes];
    const word = this.current;
    if (word) {
      outcomes.push({
        wordId: word.id,
        text: word.text,
        result: "unclassified",
      });
    }
    return {
      categoryId: this.categoryId,
      categoryName: this.categoryName,
      startedAt: this.startedAt,
      endedAt: new Date().toISOString(),
      outcomes,
    };
  }
}

/** Review-mode correction on the summary screen: move one word's status. */
export function correctOutcome(
  result: RoundResult,
  wordId: string,
  newResult: WordResult,
): RoundResult {
  return {
    ...result,
    outcomes: result.outcomes.map((o) =>
      o.wordId === wordId ? { ...o, result: newResult } : o,
    ),
  };
}

export function summarize(result: RoundResult): {
  correct: number;
  skipped: number;
  unclassified: number;
  presented: number;
} {
  const counts = { correct: 0, skipped: 0, unclassified: 0 };
  for (const o of result.outcomes) counts[o.result]++;
  return { ...counts, presented: result.outcomes.length };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
