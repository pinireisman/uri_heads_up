import { useState } from "react";
import { useT } from "../i18n";
import { correctOutcome, summarize } from "../domain/round";
import type { RoundOutcome, WordResult } from "../domain/types";
import { updateRound } from "../persistence/repositories";
import { dbReady } from "../startup";
import { getLastRound, setLastRound, useSettings } from "./data";

const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function ResultsPage() {
  const t = useT();
  const { settings } = useSettings();
  const last = getLastRound();
  const [result, setResult] = useState(last?.result);

  if (!last || !result) {
    return (
      <main className="page">
        <a href="#/">← {t("back")}</a>
      </main>
    );
  }

  const move = (wordId: string, to: WordResult) => {
    const updated = correctOutcome(result, wordId, to);
    setResult(updated);
    setLastRound(updated, last.key);
    void dbReady.then((db) => updateRound(db, last.key, updated));
  };

  const counts = summarize(result);
  const group = (status: WordResult) =>
    result.outcomes.filter((o) => o.result === status);

  const row = (o: RoundOutcome) => (
    <li key={o.wordId} className="word-row">
      <span className="word-text">{o.text}</span>
      {o.result !== "correct" && (
        <button className="btn-plain" onClick={() => move(o.wordId, "correct")}>
          ✓ {t("markCorrect")}
        </button>
      )}
      {o.result !== "skipped" && (
        <button className="btn-plain" onClick={() => move(o.wordId, "skipped")}>
          ↷ {t("markSkipped")}
        </button>
      )}
    </li>
  );

  return (
    <main className="page">
      <h1>{t("resultsTitle")}</h1>
      <p>
        {result.categoryName} — {t("presentedTotal", { n: counts.presented })}
        {settings.showRoundTimer && result.durationMs != null && (
          <> — {t("resultsTime", { t: formatDuration(result.durationMs) })}</>
        )}
      </p>
      <div className="score-row">
        <div className="score score-correct">
          <strong>{counts.correct}</strong> ✓ {t("correctList")}
        </div>
        <div className="score score-skip">
          <strong>{counts.skipped}</strong> ↷ {t("skippedList")}
        </div>
      </div>

      {(["correct", "skipped", "unclassified"] as const).map((status) => {
        const items = group(status);
        if (items.length === 0) return null;
        return (
          <section key={status}>
            <h2>
              {status === "correct"
                ? t("correctList")
                : status === "skipped"
                  ? t("skippedList")
                  : t("unclassifiedList")}
            </h2>
            <ul className="word-list">{items.map(row)}</ul>
          </section>
        );
      })}

      <nav className="stack">
        <a
          className="btn btn-primary"
          href={`#/play/${encodeURIComponent(result.categoryId)}`}
        >
          {t("playAgain")}
        </a>
        <a className="btn" href="#/">
          {t("chooseCategory")}
        </a>
      </nav>
    </main>
  );
}
