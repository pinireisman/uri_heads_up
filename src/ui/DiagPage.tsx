// ponytail: dev-only diagnostics page, English-only strings by design (D3/D4);
// player-facing screens go through i18n.
import { useEffect, useRef, useState } from "react";
import { Ema, screenPitchDeg } from "../sensors/orientation";
import { CALIBRATION, computeBaseline } from "../sensors/calibration";
import {
  GestureClassifier,
  defaultGestureConfig,
  type GestureAction,
  type GestureConfig,
} from "../sensors/gestureClassifier";
import {
  needsPermissionGesture,
  requestMotionPermission,
} from "../sensors/permission";

type Status =
  "idle" | "granted" | "denied" | "unsupported" | "no-data" | "active";

type Phase =
  | { kind: "none" }
  | { kind: "calibrating"; until: number }
  | { kind: "failed"; reason: string }
  | { kind: "ready"; baseline: number; spread: number };

interface Snapshot {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  hz: number;
  pitch: number | null;
  filtered: number | null;
  state: string;
  orientation: string;
  countdown: number | null;
}

const EMPTY: Snapshot = {
  alpha: null,
  beta: null,
  gamma: null,
  hz: 0,
  pitch: null,
  filtered: null,
  state: "—",
  orientation: "—",
  countdown: null,
};

export default function DiagPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [phase, setPhase] = useState<Phase>({ kind: "none" });
  const [config, setConfig] = useState<GestureConfig>(defaultGestureConfig);
  const [emaAlpha, setEmaAlpha] = useState(0.25);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [counts, setCounts] = useState({ CORRECT: 0, SKIP: 0 });
  const [flash, setFlash] = useState<GestureAction | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const raw = useRef<{
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
  }>({ alpha: null, beta: null, gamma: null });
  const pitchRef = useRef<number | null>(null);
  const filteredRef = useRef<number | null>(null);
  const eventCount = useRef(0);
  const totalEvents = useRef(0);
  const samples = useRef<number[]>([]);
  const phaseRef = useRef<Phase>({ kind: "none" });
  const ema = useRef(new Ema(0.25));
  const classifier = useRef(new GestureClassifier(config));
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  phaseRef.current = phase;

  // Rebuild the pipeline when tuning values change.
  useEffect(() => {
    classifier.current = new GestureClassifier(config);
    ema.current = new Ema(emaAlpha);
    filteredRef.current = null;
  }, [config, emaAlpha]);

  useEffect(() => {
    if (status !== "granted" && status !== "active") return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      eventCount.current++;
      totalEvents.current++;
      raw.current = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
      if (e.beta === null || e.gamma === null) return;
      const pitch = screenPitchDeg(e.beta, e.gamma);
      pitchRef.current = pitch;

      const ph = phaseRef.current;
      if (ph.kind === "calibrating") {
        samples.current.push(pitch);
        return;
      }
      if (ph.kind !== "ready") return;

      const filtered = ema.current.next(pitch - ph.baseline);
      filteredRef.current = filtered;
      const transition = classifier.current.step(filtered, performance.now());
      if (!transition) return;
      const stamp = (transition.at / 1000).toFixed(1);
      setLog((prev) =>
        [
          `${stamp}s  ${transition.state}${transition.action ? `  ⟶ ${transition.action}` : ""}`,
          ...prev,
        ].slice(0, 25),
      );
      if (transition.action) {
        const action = transition.action;
        setCounts((prev) => ({ ...prev, [action]: prev[action] + 1 }));
        setFlash(action);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 500);
      }
    };

    window.addEventListener("deviceorientation", onOrientation);
    // Permission granted but no events ever arriving is a real state (FR-4).
    const noData = setTimeout(() => {
      if (totalEvents.current === 0) setStatus("no-data");
      else setStatus("active");
    }, 2000);

    let lastTick = performance.now();
    const display = setInterval(() => {
      const now = performance.now();
      const hz = Math.round((eventCount.current * 1000) / (now - lastTick));
      eventCount.current = 0;
      lastTick = now;
      const ph = phaseRef.current;
      setSnap({
        ...raw.current,
        hz,
        pitch: pitchRef.current,
        filtered: filteredRef.current,
        state: classifier.current.current,
        orientation: screen.orientation
          ? `${screen.orientation.type} ${screen.orientation.angle}°`
          : "n/a",
        countdown:
          ph.kind === "calibrating"
            ? Math.max(0, Math.ceil((ph.until - now) / 1000))
            : null,
      });
    }, 100);

    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      clearTimeout(noData);
      clearInterval(display);
    };
  }, [status]);

  async function enable() {
    setStatus(await requestMotionPermission());
  }

  function calibrate() {
    samples.current = [];
    setCounts({ CORRECT: 0, SKIP: 0 });
    setLog([]);
    setPhase({
      kind: "calibrating",
      until: performance.now() + CALIBRATION.windowMs,
    });
    setTimeout(() => {
      const result = computeBaseline(samples.current);
      if (result.ok) {
        ema.current.reset();
        classifier.current.reset();
        setPhase({
          kind: "ready",
          baseline: result.baselineDeg,
          spread: result.spreadDeg,
        });
      } else {
        setPhase({
          kind: "failed",
          reason:
            result.reason === "no-data"
              ? `too few samples (${samples.current.length})`
              : `unstable, spread ${result.spreadDeg.toFixed(1)}° > ${CALIBRATION.maxSpreadDeg}°`,
        });
      }
    }, CALIBRATION.windowMs);
  }

  const fmt = (v: number | null, digits = 1) =>
    v === null ? "—" : v.toFixed(digits);
  const sensing = status === "granted" || status === "active";

  return (
    <main className="diag">
      {flash && (
        <div className={`flash flash-${flash.toLowerCase()}`}>
          {flash === "CORRECT" ? "✓ CORRECT" : "↷ SKIP"}
        </div>
      )}
      {snap.countdown !== null && (
        <div className="flash flash-cal">{snap.countdown || "…"}</div>
      )}

      <h1>Sensor diagnostics</h1>
      <p className="diag-row">
        <span>permission: {status}</span>
        <span>ios-gesture-prompt: {String(needsPermissionGesture())}</span>
        <span>rate: {snap.hz} Hz</span>
        <span>screen: {snap.orientation}</span>
      </p>

      {!sensing && (
        <button onClick={enable} disabled={status === "unsupported"}>
          Enable sensors
        </button>
      )}
      {status === "denied" && (
        <p>
          Motion access denied. On iPhone: Settings → Safari → Motion &
          Orientation Access, then reload.
        </p>
      )}
      {status === "no-data" && (
        <p>Permission looks fine but no orientation events are arriving.</p>
      )}

      {sensing && (
        <>
          <section className="diag-numbers">
            <div>
              <label>raw pitch</label>
              <strong>{fmt(snap.pitch)}°</strong>
            </div>
            <div>
              <label>filtered Δ</label>
              <strong className="big">{fmt(snap.filtered)}°</strong>
            </div>
            <div>
              <label>state</label>
              <strong>{snap.state}</strong>
            </div>
            <div>
              <label>✓ {counts.CORRECT}</label>
              <label>↷ {counts.SKIP}</label>
            </div>
          </section>

          <p className="diag-row">
            <span>α {fmt(raw.current.alpha, 0)}</span>
            <span>β {fmt(snap.beta, 0)}</span>
            <span>γ {fmt(snap.gamma, 0)}</span>
            <span>
              baseline:{" "}
              {phase.kind === "ready"
                ? `${phase.baseline.toFixed(1)}° (±${(phase.spread / 2).toFixed(1)}°)`
                : "not calibrated"}
            </span>
          </p>
          {phase.kind === "failed" && (
            <p>Calibration failed: {phase.reason}. Hold still and retry.</p>
          )}

          <button onClick={calibrate} disabled={phase.kind === "calibrating"}>
            {phase.kind === "ready" ? "Recalibrate" : "Calibrate (hold still)"}
          </button>

          <details>
            <summary>Tuning</summary>
            <div className="diag-tuning">
              {(
                [
                  ["neutralZoneDeg", "neutral ±°"],
                  ["triggerDeg", "trigger °"],
                  ["dwellMs", "dwell ms"],
                  ["lockoutMs", "lockout ms"],
                  ["rearmMs", "rearm ms"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    value={config[key]}
                    onChange={(e) =>
                      setConfig({ ...config, [key]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
              <label>
                EMA α
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  max="1"
                  value={emaAlpha}
                  onChange={(e) => setEmaAlpha(Number(e.target.value))}
                />
              </label>
            </div>
          </details>

          <ol className="diag-log">
            {log.map((line, i) => (
              <li key={`${line}-${i}`}>{line}</li>
            ))}
          </ol>
        </>
      )}
      <p>
        <a href="#/">← Home</a>
      </p>
    </main>
  );
}
