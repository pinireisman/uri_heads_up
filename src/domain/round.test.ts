import { describe, expect, test } from "vitest";
import { Round, correctOutcome, summarize } from "./round";
import type { Category } from "./types";

function makeCategory(count = 5, disabled: number[] = []): Category {
  return {
    id: "cat",
    name: "Test",
    description: "",
    icon: "",
    color: "",
    enabled: true,
    words: Array.from({ length: count }, (_, i) => ({
      id: `w${i}`,
      text: `Word ${i}`,
      enabled: !disabled.includes(i),
    })),
  };
}

describe("Round", () => {
  test("shuffle is deterministic with an injected rng and excludes disabled words", () => {
    const category = makeCategory(5, [1, 3]);
    const a = new Round(category, () => 0.42);
    const b = new Round(category, () => 0.42);
    const order = (r: Round) => {
      const seen: string[] = [];
      while (r.current) {
        seen.push(r.current.id);
        r.classify("correct");
      }
      return seen;
    };
    const orderA = order(a);
    expect(orderA).toEqual(order(b));
    expect(orderA.sort()).toEqual(["w0", "w2", "w4"]); // disabled words never appear
  });

  test("no word repeats and the deck exhausts", () => {
    const round = new Round(makeCategory(4));
    const seen = new Set<string>();
    while (round.current) {
      expect(seen.has(round.current.id)).toBe(false);
      seen.add(round.current.id);
      round.classify("skipped");
    }
    expect(seen.size).toBe(4);
    expect(round.isComplete).toBe(true);
    round.classify("correct"); // ignored after exhaustion
    expect(round.end().outcomes).toHaveLength(4);
  });

  test("ending mid-round marks the visible word unclassified", () => {
    const round = new Round(makeCategory(3));
    round.classify("correct");
    round.classify("skipped");
    const result = round.end();
    expect(summarize(result)).toEqual({
      correct: 1,
      skipped: 1,
      unclassified: 1,
      presented: 3,
    });
  });

  test("presented counts the word on screen", () => {
    const round = new Round(makeCategory(2));
    expect(round.presented).toBe(1);
    round.classify("correct");
    expect(round.presented).toBe(2);
    round.classify("correct");
    expect(round.presented).toBe(2);
  });

  test("empty category ends immediately", () => {
    const round = new Round(makeCategory(2, [0, 1]));
    expect(round.isComplete).toBe(true);
    expect(round.end().outcomes).toHaveLength(0);
  });

  test("correctOutcome moves one word between statuses", () => {
    const round = new Round(makeCategory(2));
    round.classify("skipped");
    round.classify("skipped");
    const result = round.end();
    const fixed = correctOutcome(result, result.outcomes[0]!.wordId, "correct");
    expect(summarize(fixed).correct).toBe(1);
    expect(summarize(fixed).skipped).toBe(1);
    expect(summarize(result).skipped).toBe(2); // original untouched
  });
});

describe("words per round limit", () => {
  test("limits the deck to N random words", () => {
    const round = new Round(makeCategory(10), Math.random, 3);
    let n = 0;
    while (round.current) {
      round.classify("correct");
      n++;
    }
    expect(n).toBe(3);
  });

  test("0 or oversized limit plays the whole deck", () => {
    expect(new Round(makeCategory(4), Math.random, 0).end).toBeDefined();
    const all = new Round(makeCategory(4), Math.random, 99);
    let n = 0;
    while (all.current) {
      all.classify("skipped");
      n++;
    }
    expect(n).toBe(4);
  });
});
