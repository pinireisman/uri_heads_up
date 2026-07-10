import { describe, expect, test } from "vitest";
import { Ema, screenPitchDeg } from "./orientation";
import { CALIBRATION, computeBaseline } from "./calibration";
import {
  GestureClassifier,
  defaultGestureConfig,
  type GestureTransition,
} from "./gestureClassifier";

describe("screenPitchDeg", () => {
  test("flat on table, screen up", () => {
    expect(screenPitchDeg(0, 0)).toBeCloseTo(90);
  });

  test("flat, screen down", () => {
    expect(screenPitchDeg(180, 0)).toBeCloseTo(-90);
  });

  test("upright portrait (forehead-like) is zero", () => {
    expect(screenPitchDeg(90, 0)).toBeCloseTo(0);
  });

  test("upright in either landscape direction is zero", () => {
    expect(screenPitchDeg(0, 90)).toBeCloseTo(0);
    expect(screenPitchDeg(0, -90)).toBeCloseTo(0);
  });

  test("leaning back 45° from upright faces up, leaning forward faces down", () => {
    expect(screenPitchDeg(45, 0)).toBeCloseTo(45);
    expect(screenPitchDeg(135, 0)).toBeCloseTo(-45);
  });

  test("clamps rounding overflow instead of returning NaN", () => {
    expect(Number.isFinite(screenPitchDeg(0.0000001, -0.0000001))).toBe(true);
  });
});

describe("Ema", () => {
  test("first sample passes through, later samples smooth", () => {
    const ema = new Ema(0.5);
    expect(ema.next(10)).toBe(10);
    expect(ema.next(20)).toBe(15);
    ema.reset();
    expect(ema.next(-4)).toBe(-4);
  });
});

describe("computeBaseline", () => {
  const stable = Array.from({ length: 60 }, (_, i) => 2 + (i % 3)); // 2..4

  test("stable samples produce the mean", () => {
    const result = computeBaseline(stable);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.baselineDeg).toBeCloseTo(3, 0);
      expect(result.spreadDeg).toBe(2);
    }
  });

  test("too few samples is no-data", () => {
    const result = computeBaseline(stable.slice(0, CALIBRATION.minSamples - 1));
    expect(result).toMatchObject({ ok: false, reason: "no-data" });
  });

  test("excessive spread is unstable", () => {
    const wobbly = [...stable, 2 + CALIBRATION.maxSpreadDeg + 1];
    expect(computeBaseline(wobbly)).toMatchObject({
      ok: false,
      reason: "unstable",
    });
  });
});

describe("GestureClassifier", () => {
  const cfg = defaultGestureConfig; // neutral 15, trigger 35, dwell 150, lockout 400, rearm 250

  /** Feed a constant pitch for a duration at 60Hz, collecting transitions. */
  function feed(
    c: GestureClassifier,
    pitch: number,
    startMs: number,
    durationMs: number,
  ): { transitions: GestureTransition[]; endMs: number } {
    const transitions: GestureTransition[] = [];
    let t = startMs;
    for (; t <= startMs + durationMs; t += 16) {
      const tr = c.step(pitch, t);
      if (tr) transitions.push(tr);
    }
    return { transitions, endMs: t };
  }

  function armed(): { c: GestureClassifier; t: number } {
    const c = new GestureClassifier(cfg);
    const { endMs } = feed(c, 0, 0, cfg.rearmMs + 100);
    expect(c.current).toBe("NEUTRAL");
    return { c, t: endMs };
  }

  test("starts unarmed and arms only after continuous neutral", () => {
    const c = new GestureClassifier(cfg);
    expect(c.current).toBe("WAITING_FOR_NEUTRAL");
    feed(c, -50, 0, 500); // tilted from the start: must not arm or fire
    expect(c.current).toBe("WAITING_FOR_NEUTRAL");
    feed(c, 0, 600, cfg.rearmMs + 50);
    expect(c.current).toBe("NEUTRAL");
  });

  test("tilt down held past dwell fires exactly one CORRECT", () => {
    const { c, t } = armed();
    const { transitions } = feed(c, -45, t, cfg.dwellMs + 100);
    expect(transitions.map((tr) => tr.state)).toEqual([
      "CORRECT_CANDIDATE",
      "FEEDBACK_LOCKED",
    ]);
    expect(transitions[1]?.action).toBe("CORRECT");
  });

  test("tilt up fires SKIP", () => {
    const { c, t } = armed();
    const { transitions } = feed(c, 45, t, cfg.dwellMs + 100);
    expect(transitions.at(-1)?.action).toBe("SKIP");
  });

  test("sustained tilt never fires a second action", () => {
    const { c, t } = armed();
    const { transitions } = feed(c, -45, t, 5000); // held down for 5 seconds
    const actions = transitions.filter((tr) => tr.action);
    expect(actions).toHaveLength(1);
    expect(c.current).toBe("WAITING_FOR_NEUTRAL");
  });

  test("full cycle: correct, back to neutral, then skip", () => {
    const { c, t } = armed();
    const a = feed(c, -45, t, cfg.dwellMs + cfg.lockoutMs + 100);
    const b = feed(c, 0, a.endMs, cfg.rearmMs + 100);
    expect(c.current).toBe("NEUTRAL");
    const d = feed(c, 45, b.endMs, cfg.dwellMs + 100);
    expect(d.transitions.at(-1)?.action).toBe("SKIP");
  });

  test("a spike shorter than dwell aborts without firing", () => {
    const { c, t } = armed();
    const spike = feed(c, -45, t, cfg.dwellMs / 3);
    const settle = feed(c, 0, spike.endMs, 100);
    const all = [...spike.transitions, ...settle.transitions];
    expect(all.some((tr) => tr.action)).toBe(false);
    expect(c.current).toBe("NEUTRAL");
  });

  test("leaving the neutral zone during rearm restarts the rearm clock", () => {
    const { c, t } = armed();
    const fire = feed(c, -45, t, cfg.dwellMs + cfg.lockoutMs + 100);
    expect(c.current).toBe("WAITING_FOR_NEUTRAL");
    // bounce: neutral briefly, then out of zone, then neutral again
    const n1 = feed(c, 0, fire.endMs, cfg.rearmMs / 2);
    const out = feed(c, cfg.neutralZoneDeg + 5, n1.endMs, 100);
    expect(c.current).toBe("WAITING_FOR_NEUTRAL");
    const n2 = feed(c, 0, out.endMs, cfg.rearmMs - 50);
    expect(c.current).toBe("WAITING_FOR_NEUTRAL"); // not yet: clock restarted
    feed(c, 0, n2.endMs, 100);
    expect(c.current).toBe("NEUTRAL");
  });
});
