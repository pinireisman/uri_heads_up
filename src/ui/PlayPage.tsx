import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { Round } from "../domain/round";
import { enabledWords } from "../domain/types";
import { addRound } from "../persistence/repositories";
import { dbReady } from "../startup";
import { categoryRepo, setLastRound, useSettings } from "./data";
import { playFanfare, playFeedback } from "./sounds";
import { useWakeLock } from "../pwa/wakeLock";
import {
  MotionController,
  type MotionState,
} from "../sensors/motionController";
import {
  gestureConfigFor,
  type GestureAction,
} from "../sensors/gestureClassifier";
import { needsPermissionGesture } from "../sensors/permission";

type Stage =
  | "init"
  | "permission" // iOS: explain, then request from a direct tap (§6.2)
  | "calibrating"
  | "unstable"
  | "denied"
  | "countdown" // touch-only path
  | "live";

type Phase = "play" | "feedback" | "complete";

export default function PlayPage({ id }: { id: string }) {
  const t = useT();
  const { settings, ready: settingsReady } = useSettings();
  const [round, setRound] = useState<Round | null>(null);
  const [stage, setStage] = useState<Stage>("init");
  const [phase, setPhase] = useState<Phase>("play");
  const [count, setCount] = useState(3);
  const [feedback, setFeedback] = useState<"correct" | "skipped" | null>(null);
  const [motionActive, setMotionActive] = useState(false);
  const [notice, setNotice] = useState(false);
  const controller = useRef<MotionController | null>(null);
  const endedRef = useRef(false);
  const liveSinceRef = useRef<number | null>(null);
  const actionRef = useRef<(a: GestureAction) => void>(() => {});

  useWakeLock(
    settings.keepAwake && (stage === "live" || stage === "calibrating"),
  );

  // wait for stored settings so wordsPerRound/motion apply to this round
  useEffect(() => {
    if (!settingsReady || round) return;
    void categoryRepo().then(async (repo) => {
      const category = await repo.get(id);
      if (!category || enabledWords(category).length === 0) {
        window.location.hash = "#/";
        return;
      }
      setRound(new Round(category, Math.random, settings.wordsPerRound));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, settingsReady, round]);

  useEffect(() => () => controller.current?.stop(), []);

  // lock landscape for the round only (installed PWA / fullscreen); editor
  // screens stay rotatable. Best-effort per FR-13 — rejection is fine.
  useEffect(() => {
    try {
      void (
        screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        }
      )
        .lock?.("landscape")
        .catch(() => {});
    } catch {
      /* unsupported */
    }
    return () => {
      try {
        screen.orientation.unlock();
      } catch {
        /* unsupported */
      }
    };
  }, []);

  const startMotion = () => {
    controller.current?.stop();
    const c = new MotionController(gestureConfigFor(settings.sensitivity), {
      onState: (s: MotionState) => {
        switch (s) {
          case "calibrating":
            setCount(3);
            setStage("calibrating");
            break;
          case "active":
            setMotionActive(true);
            setStage("live");
            break;
          case "calibration-unstable":
            setStage("unstable");
            break;
          case "denied":
            setStage("denied");
            break;
          default: // no-data / unsupported: calibration window already served as the countdown
            setNotice(true);
            setMotionActive(false);
            setStage("live");
        }
      },
      onAction: (a) => actionRef.current(a),
    });
    controller.current = c;
    void c.start();
  };

  const useTouchInstead = () => {
    controller.current?.stop();
    setNotice(true);
    setMotionActive(false);
    setCount(3);
    setStage("countdown");
  };

  // entry path, once the round is loaded
  useEffect(() => {
    if (!round || stage !== "init") return;
    if (!settings.motionEnabled) {
      setStage("countdown");
    } else if (needsPermissionGesture()) {
      setStage("permission");
    } else {
      startMotion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, stage, settings.motionEnabled]);

  // tick for the touch countdown and the calibration display
  useEffect(() => {
    if (stage !== "countdown" && stage !== "calibrating") return;
    if (count <= 0) {
      if (stage === "countdown") setStage("live");
      return; // calibrating: MotionController decides when the window ends
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, count]);

  // the timer starts when the first word appears (stage → live)
  useEffect(() => {
    if (stage === "live") liveSinceRef.current ??= performance.now();
  }, [stage]);

  const finish = useCallback(async (r: Round) => {
    if (endedRef.current) return;
    endedRef.current = true;
    controller.current?.stop();
    const result = r.end();
    if (liveSinceRef.current !== null) {
      result.durationMs = Math.round(performance.now() - liveSinceRef.current);
    }
    const key = await addRound(await dbReady, result);
    setLastRound(result, key);
    window.location.hash = "#/results";
  }, []);

  const classify = useCallback(
    (result: "correct" | "skipped") => {
      if (!round || stage !== "live" || phase !== "play") return;
      round.classify(result);
      setFeedback(result);
      setPhase("feedback");
      if (settings.soundEnabled) playFeedback(result);
      // PRD §8.3: hold feedback ~400ms so other players perceive it
      setTimeout(() => {
        setFeedback(null);
        if (round.isComplete) {
          setPhase("complete");
          if (settings.soundEnabled) playFanfare();
          setTimeout(() => void finish(round), 900);
        } else {
          setPhase("play");
        }
      }, 400);
    },
    [round, stage, phase, finish, settings.soundEnabled],
  );

  // gestures route through the same classify path as buttons (FR-7);
  // via ref so the controller always sees current settings/phase
  actionRef.current = (action: GestureAction) => {
    const down = action === "CORRECT";
    classify(down !== settings.invertDirections ? "correct" : "skipped");
  };

  const endRound = useCallback(() => {
    if (!round || endedRef.current) return;
    if (settings.confirmEndRound && !window.confirm(t("confirmEnd"))) return;
    void finish(round);
  }, [round, settings.confirmEndRound, finish, t]);

  // FR-7 keyboard controls for desktop testing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") classify("correct");
      else if (e.key === "ArrowUp") classify("skipped");
      else if (e.key === "Escape") endRound();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [classify, endRound]);

  if (!round || stage === "init") return null;

  if (stage === "permission") {
    return (
      <main className="play">
        <p className="setup-text">{t("motionExplain")}</p>
        <nav className="stack">
          <button className="btn btn-primary" onClick={startMotion}>
            {t("enableMotion")}
          </button>
          <button className="btn" onClick={useTouchInstead}>
            {t("useTouch")}
          </button>
        </nav>
      </main>
    );
  }

  if (stage === "denied") {
    return (
      <main className="play">
        <p className="setup-text">{t("motionDenied")}</p>
        <nav className="stack">
          <button className="btn btn-primary" onClick={useTouchInstead}>
            {t("useTouch")}
          </button>
        </nav>
      </main>
    );
  }

  if (stage === "unstable") {
    return (
      <main className="play">
        <p className="setup-text notice">{t("calibrationFailed")}</p>
        <nav className="stack">
          <button
            className="btn btn-primary"
            onClick={() => controller.current?.calibrate()}
          >
            {t("retryCalibration")}
          </button>
          <button className="btn" onClick={useTouchInstead}>
            {t("useTouch")}
          </button>
        </nav>
      </main>
    );
  }

  if (stage === "countdown" || stage === "calibrating") {
    return (
      <main className="play">
        <div className="rotate-note">{t("rotatePrompt")}</div>
        <div className="play-countdown" role="status">
          <div className="count-number">{count > 0 ? count : ""}</div>
          <p>{stage === "calibrating" ? t("holdStill") : t("getReady")}</p>
        </div>
      </main>
    );
  }

  const showTouch = !motionActive || settings.showTouchDuringMotion;
  return (
    <main className="play">
      <div className="rotate-note">{t("rotatePrompt")}</div>
      <h1 className="play-word">{round.current?.text}</h1>
      <div className="play-meta">
        {settings.showPresentedCount &&
          t("presentedCount", { n: round.presented })}
        {notice && <span className="badge">{t("sensorNotice")}</span>}
      </div>
      <div className="play-controls">
        {showTouch && (
          <button className="btn btn-skip" onClick={() => classify("skipped")}>
            ↷ {t("skip")}
          </button>
        )}
        <button className="btn btn-end" onClick={endRound}>
          {t("endRound")}
        </button>
        {showTouch && (
          <button
            className="btn btn-correct"
            onClick={() => classify("correct")}
          >
            ✓ {t("correct")}
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`flash flash-${feedback === "correct" ? "correct" : "skip"}`}
        >
          {feedback === "correct" ? `✓ ${t("correct")}` : `↷ ${t("skip")}`}
        </div>
      )}
      {phase === "complete" && !feedback && (
        <div className="flash flash-complete">{t("deckComplete")}</div>
      )}
    </main>
  );
}
