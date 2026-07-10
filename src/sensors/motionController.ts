import { Ema, screenPitchDeg } from "./orientation";
import { CALIBRATION, computeBaseline } from "./calibration";
import {
  GestureClassifier,
  type GestureAction,
  type GestureConfig,
} from "./gestureClassifier";
import { requestMotionPermission } from "./permission";

export type MotionState =
  | "preparing"
  | "unsupported"
  | "denied"
  | "no-data"
  | "calibrating"
  | "calibration-unstable"
  | "active";

export interface MotionEvents {
  onState: (state: MotionState) => void;
  onAction: (action: GestureAction) => void;
}

const EMA_ALPHA = 0.25;

/** Synthetic sensor injection for automated tests (PRD §12.3):
 * `window.dispatchEvent(new CustomEvent("uhu:sensor", { detail: { beta, gamma } }))` */
export const SYNTHETIC_EVENT = "uhu:sensor";

/**
 * Gameplay-side sensor adapter: owns permission, calibration, filtering and
 * the gesture classifier, and reports only semantic actions upward. The
 * round engine never sees raw sensor data (PRD §10.3).
 */
export class MotionController {
  private config: GestureConfig;
  private events: MotionEvents;
  private ema = new Ema(EMA_ALPHA);
  private classifier: GestureClassifier;
  private baseline: number | null = null;
  private samples: number[] = [];
  private state: MotionState = "calibrating";
  private calTimer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;

  constructor(config: GestureConfig, events: MotionEvents) {
    this.config = config;
    this.events = events;
    this.classifier = new GestureClassifier(config);
  }

  /** On iOS this must be called from a direct user tap (permission prompt). */
  async start(): Promise<void> {
    if (typeof DeviceOrientationEvent === "undefined") {
      this.setState("unsupported");
      return;
    }
    const permission = await requestMotionPermission();
    if (permission !== "granted") {
      this.setState(permission);
      return;
    }
    window.addEventListener("deviceorientation", this.onOrientation);
    window.addEventListener(SYNTHETIC_EVENT, this.onSynthetic as EventListener);
    screen.orientation?.addEventListener("change", this.onOrientationChange);
    this.calibrate();
  }

  /** A short prepare phase gives the player time to raise the phone to the
   * forehead, then samples are collected for the countdown window. */
  calibrate(): void {
    if (this.stopped) return;
    this.baseline = null;
    this.setState("preparing");
    clearTimeout(this.calTimer);
    this.calTimer = setTimeout(() => {
      if (this.stopped) return;
      this.samples = [];
      this.setState("calibrating");
      this.calTimer = setTimeout(() => {
        const result = computeBaseline(this.samples);
        if (result.ok) {
          this.baseline = result.baselineDeg;
          this.ema.reset();
          this.classifier = new GestureClassifier(this.config);
          this.setState("active");
        } else {
          this.setState(
            result.reason === "no-data" ? "no-data" : "calibration-unstable",
          );
        }
      }, CALIBRATION.windowMs);
    }, CALIBRATION.prepareMs);
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.calTimer);
    window.removeEventListener("deviceorientation", this.onOrientation);
    window.removeEventListener(
      SYNTHETIC_EVENT,
      this.onSynthetic as EventListener,
    );
    screen.orientation?.removeEventListener("change", this.onOrientationChange);
  }

  private setState(state: MotionState): void {
    if (this.stopped) return;
    this.state = state;
    this.events.onState(state);
  }

  private handleSample(beta: number, gamma: number): void {
    const pitch = screenPitchDeg(beta, gamma);
    if (this.state === "calibrating") {
      this.samples.push(pitch);
      return;
    }
    if (this.state !== "active" || this.baseline === null) return;
    const filtered = this.ema.next(pitch - this.baseline);
    const transition = this.classifier.step(filtered, performance.now());
    if (transition?.action) this.events.onAction(transition.action);
  }

  private onOrientation = (e: DeviceOrientationEvent): void => {
    if (e.beta === null || e.gamma === null) return;
    this.handleSample(e.beta, e.gamma);
  };

  private onSynthetic = (
    e: CustomEvent<{ beta: number; gamma: number }>,
  ): void => {
    this.handleSample(e.detail.beta, e.detail.gamma);
  };

  // PRD FR-6: recalibrate when screen orientation changes materially
  private onOrientationChange = (): void => {
    if (this.state === "active") this.calibrate();
  };
}
