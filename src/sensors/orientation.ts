const DEG = Math.PI / 180;

/**
 * Vertical angle of the screen normal, in degrees.
 *   +90 = screen facing straight up (flat on a table)
 *     0 = screen vertical (the forehead playing position)
 *   -90 = screen facing straight down
 *
 * Derived from the world-z component of the screen normal (cosβ·cosγ, third
 * column of the W3C Rz(α)Rx(β)Ry(γ) rotation). Unlike raw beta/gamma — which
 * hit an Euler singularity exactly in the forehead posture — this value is a
 * property of the physical rotation: continuous everywhere and identical in
 * both landscape directions, so no screen-orientation compensation is needed.
 */
export function screenPitchDeg(betaDeg: number, gammaDeg: number): number {
  const z = Math.cos(betaDeg * DEG) * Math.cos(gammaDeg * DEG);
  return Math.asin(Math.max(-1, Math.min(1, z))) / DEG;
}

/** Exponential moving average. Dwell time in the classifier handles isolated
 * spikes, so no median filter is needed on top. */
export class Ema {
  private value: number | null = null;
  private alpha: number;

  constructor(alpha: number) {
    this.alpha = alpha;
  }

  next(sample: number): number {
    this.value =
      this.value === null
        ? sample
        : this.value + this.alpha * (sample - this.value);
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}
