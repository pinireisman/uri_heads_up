import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { Round } from "../domain/round";
import { enabledWords } from "../domain/types";
import { addRound } from "../persistence/repositories";
import { dbReady } from "../startup";
import { categoryRepo, setLastRound, useSettings } from "./data";

type Phase = "countdown" | "play" | "feedback" | "complete";

export default function PlayPage({ id }: { id: string }) {
  const t = useT();
  const { settings } = useSettings();
  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(3);
  const [feedback, setFeedback] = useState<"correct" | "skipped" | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    void categoryRepo().then(async (repo) => {
      const category = await repo.get(id);
      if (!category || enabledWords(category).length === 0) {
        window.location.hash = "#/";
        return;
      }
      setRound(new Round(category));
    });
  }, [id]);

  // 3-second start countdown (PRD §5.1 — positioning, not a timer;
  // calibration hooks in here in Phase 4)
  useEffect(() => {
    if (!round || phase !== "countdown") return;
    if (count <= 0) {
      setPhase("play");
      return;
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [round, phase, count]);

  const finish = useCallback(async (r: Round) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const result = r.end();
    const key = await addRound(await dbReady, result);
    setLastRound(result, key);
    window.location.hash = "#/results";
  }, []);

  const classify = useCallback(
    (result: "correct" | "skipped") => {
      if (!round || phase !== "play") return;
      round.classify(result);
      setFeedback(result);
      setPhase("feedback");
      // PRD §8.3: hold feedback ~400ms so other players perceive it
      setTimeout(() => {
        setFeedback(null);
        if (round.isComplete) {
          setPhase("complete");
          setTimeout(() => void finish(round), 900);
        } else {
          setPhase("play");
        }
      }, 400);
    },
    [round, phase, finish],
  );

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

  if (!round) return null;

  return (
    <main className="play">
      <div className="rotate-note">{t("rotatePrompt")}</div>

      {phase === "countdown" ? (
        <div className="play-countdown" role="status">
          <div className="count-number">{count > 0 ? count : ""}</div>
          <p>{t("getReady")}</p>
        </div>
      ) : (
        <>
          <h1 className="play-word">{round.current?.text}</h1>
          {settings.showPresentedCount && (
            <div className="play-meta">
              {t("presentedCount", { n: round.presented })}
            </div>
          )}
          <div className="play-controls">
            <button
              className="btn btn-skip"
              onClick={() => classify("skipped")}
            >
              ↷ {t("skip")}
            </button>
            <button className="btn btn-end" onClick={endRound}>
              {t("endRound")}
            </button>
            <button
              className="btn btn-correct"
              onClick={() => classify("correct")}
            >
              ✓ {t("correct")}
            </button>
          </div>
        </>
      )}

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
