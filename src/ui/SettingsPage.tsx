import { useState } from "react";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n/en";
import type { Sensitivity, Settings, Theme } from "../domain/settings";
import { clearRounds } from "../persistence/repositories";
import { dbReady } from "../startup";
import { useSettings } from "./data";

const toggles: [keyof Settings & string, MessageKey][] = [
  ["motionEnabled", "setMotion"],
  ["invertDirections", "setInvert"],
  ["soundEnabled", "setSound"],
  ["showTouchDuringMotion", "setShowTouch"],
  ["keepAwake", "setKeepAwake"],
  ["confirmEndRound", "setConfirmEnd"],
  ["showPresentedCount", "setShowCount"],
  ["showRoundTimer", "setShowTimer"],
];

export default function SettingsPage() {
  const t = useT();
  const { settings, update } = useSettings();
  const [message, setMessage] = useState("");

  const clearHistory = async () => {
    if (!window.confirm(t("confirmClearHistory"))) return;
    await clearRounds(await dbReady);
    setMessage(t("historyCleared"));
  };

  return (
    <main className="page">
      <a href="#/">← {t("back")}</a>
      <h1>{t("settingsTitle")}</h1>

      <div className="settings-list">
        <label className="check">
          {t("setTheme")}
          <select
            value={settings.theme}
            onChange={(e) => void update({ theme: e.target.value as Theme })}
          >
            <option value="system">{t("themeSystem")}</option>
            <option value="light">{t("themeLight")}</option>
            <option value="dark">{t("themeDark")}</option>
          </select>
        </label>
        <label className="check">
          {t("setWordsPerRound")}
          <select
            value={settings.wordsPerRound}
            onChange={(e) =>
              void update({ wordsPerRound: Number(e.target.value) })
            }
          >
            <option value={0}>{t("wordsAll")}</option>
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {toggles.map(([key, label]) => (
          <label key={key} className="check">
            <input
              type="checkbox"
              checked={settings[key] as boolean}
              onChange={(e) => void update({ [key]: e.target.checked })}
            />
            {t(label)}
          </label>
        ))}
        <label className="check">
          {t("setSensitivity")}
          <select
            value={settings.sensitivity}
            onChange={(e) =>
              void update({ sensitivity: e.target.value as Sensitivity })
            }
          >
            <option value="low">{t("sensLow")}</option>
            <option value="normal">{t("sensNormal")}</option>
            <option value="high">{t("sensHigh")}</option>
          </select>
        </label>
      </div>

      <p>
        <button className="btn" onClick={() => void clearHistory()}>
          {t("clearHistory")}
        </button>
      </p>
      {message && <p role="status">{message}</p>}
      <p className="footnote">
        <a href="#/diag">{t("diagLink")}</a>
      </p>
    </main>
  );
}
