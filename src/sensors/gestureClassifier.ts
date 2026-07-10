export type GestureAction = "CORRECT" | "SKIP";

/** Motion states only. Lifecycle states from the PRD (UNAVAILABLE,
 * CALIBRATING, PAUSED) belong to the surrounding adapter/UI, which simply
 * doesn't feed samples in while in them. */
export type GestureState =
  | "NEUTRAL"
  | "CORRECT_CANDIDATE"
  | "SKIP_CANDIDATE"
  | "FEEDBACK_LOCKED"
  | "WAITING_FOR_NEUTRAL";

export interface GestureConfig {
  neutralZoneDeg: number;
  triggerDeg: number;
  dwellMs: number;
  lockoutMs: number;
  rearmMs: number;
}

// Starting values from PRD FR-6; final numbers come from on-device tuning.
export const defaultGestureConfig: GestureConfig = {
  neutralZoneDeg: 15,
  triggerDeg: 35,
  dwellMs: 150,
  lockoutMs: 400,
  rearmMs: 250,
};

export interface GestureTransition {
  state: GestureState;
  at: number;
  action?: GestureAction;
}

/**
 * Deterministic gesture state machine. Feed it baseline-relative, filtered
 * pitch samples (degrees; negative = tilted down = CORRECT, positive =
 * tilted up = SKIP) with monotonic timestamps. Returns a transition when the
 * state changes; `transition.action` is set exactly once per recognized
 * gesture. Starts in WAITING_FOR_NEUTRAL so it only arms after the phone is
 * demonstrably held in the neutral position.
 */
export class GestureClassifier {
  private state: GestureState = "WAITING_FOR_NEUTRAL";
  private stateSince = 0;
  private neutralSince: number | null = null;
  private config: GestureConfig;

  constructor(config: GestureConfig = defaultGestureConfig) {
    this.config = config;
  }

  get current(): GestureState {
    return this.state;
  }

  reset(): void {
    this.state = "WAITING_FOR_NEUTRAL";
    this.stateSince = 0;
    this.neutralSince = null;
  }

  step(pitchDeg: number, nowMs: number): GestureTransition | null {
    const cfg = this.config;
    switch (this.state) {
      case "NEUTRAL": {
        if (pitchDeg <= -cfg.triggerDeg)
          return this.to("CORRECT_CANDIDATE", nowMs);
        if (pitchDeg >= cfg.triggerDeg) return this.to("SKIP_CANDIDATE", nowMs);
        return null;
      }
      case "CORRECT_CANDIDATE":
      case "SKIP_CANDIDATE": {
        const down = this.state === "CORRECT_CANDIDATE";
        const pastThreshold = down
          ? pitchDeg <= -cfg.triggerDeg
          : pitchDeg >= cfg.triggerDeg;
        if (!pastThreshold) return this.to("NEUTRAL", nowMs); // spike/bounce: abort
        if (nowMs - this.stateSince >= cfg.dwellMs) {
          return this.to("FEEDBACK_LOCKED", nowMs, down ? "CORRECT" : "SKIP");
        }
        return null;
      }
      case "FEEDBACK_LOCKED": {
        if (nowMs - this.stateSince >= cfg.lockoutMs) {
          return this.to("WAITING_FOR_NEUTRAL", nowMs);
        }
        return null;
      }
      case "WAITING_FOR_NEUTRAL": {
        // Requires a continuous rearm period inside the neutral zone, so a
        // sustained tilt can never advance through multiple words.
        if (Math.abs(pitchDeg) <= cfg.neutralZoneDeg) {
          this.neutralSince ??= nowMs;
          if (nowMs - this.neutralSince >= cfg.rearmMs) {
            return this.to("NEUTRAL", nowMs);
          }
        } else {
          this.neutralSince = null;
        }
        return null;
      }
    }
  }

  private to(
    state: GestureState,
    at: number,
    action?: GestureAction,
  ): GestureTransition {
    this.state = state;
    this.stateSince = at;
    this.neutralSince = null;
    const transition: GestureTransition = { state, at };
    if (action) transition.action = action;
    return transition;
  }
}
