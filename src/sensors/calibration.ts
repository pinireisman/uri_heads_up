export const CALIBRATION = {
  prepareMs: 3000, // raise-the-phone grace before sampling starts
  windowMs: 3000,
  minSamples: 30, // ~1s of events at typical rates; fewer means sensors are not delivering
  maxSpreadDeg: 12,
};

export type CalibrationResult =
  | { ok: true; baselineDeg: number; spreadDeg: number }
  | { ok: false; reason: "no-data" | "unstable"; spreadDeg: number };

/** Compute the neutral baseline from pitch samples collected during the
 * start countdown. Rejects absent or unstable readings. */
export function computeBaseline(pitchSamples: number[]): CalibrationResult {
  if (pitchSamples.length < CALIBRATION.minSamples) {
    return { ok: false, reason: "no-data", spreadDeg: 0 };
  }
  const min = Math.min(...pitchSamples);
  const max = Math.max(...pitchSamples);
  const spreadDeg = max - min;
  if (spreadDeg > CALIBRATION.maxSpreadDeg) {
    return { ok: false, reason: "unstable", spreadDeg };
  }
  const mean = pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length;
  return { ok: true, baselineDeg: mean, spreadDeg };
}
