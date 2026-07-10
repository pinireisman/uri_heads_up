import { expect, test } from "vitest";
import { en } from "./en";
import { he } from "./he";

test("locale dictionaries have identical keys and no empty strings", () => {
  expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  for (const dict of [en, he]) {
    for (const [key, value] of Object.entries(dict)) {
      expect(value.trim(), key).not.toBe("");
    }
  }
});
