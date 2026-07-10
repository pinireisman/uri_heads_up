import { useEffect, useState } from "react";
import { useT } from "../i18n";
import type { MessageKey } from "../i18n/en";
import {
  LIMITS,
  exportCategories,
  parseImport,
  type ImportErrorCode,
  type ImportPreview,
  type ImportStrategy,
  type ImportWarning,
} from "../importexport/importexport";
import {
  executeImport,
  getBackup,
  restoreBackup,
} from "../persistence/repositories";
import { dbReady } from "../startup";
import { useCategories } from "./data";

const errorKeys: Record<ImportErrorCode, MessageKey> = {
  "too-large": "errTooLarge",
  "invalid-json": "errInvalidJson",
  "missing-version": "errMissingVersion",
  "future-version": "errFutureVersion",
  invalid: "errInvalid",
};

const warningKeys: Record<ImportWarning["code"], MessageKey> = {
  "duplicate-words-removed": "warnDuplicateWords",
  "empty-words": "warnEmptyWords",
  "duplicate-id-regenerated": "warnDuplicateId",
};

export default function ImportExportPage() {
  const t = useT();
  const { categories, reload } = useCategories();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [hasBackup, setHasBackup] = useState(false);
  const [scope, setScope] = useState("all");
  const [onlyEnabled, setOnlyEnabled] = useState(false);

  useEffect(() => {
    void dbReady.then(async (db) => setHasBackup(!!(await getBackup(db))));
  }, [message]);

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setError("");
    setMessage("");
    if (!file) return;
    if (file.size > LIMITS.fileBytes) {
      setError(t("errTooLarge"));
      return;
    }
    const parsed = parseImport(await file.text(), categories ?? []);
    if (parsed.ok) setPreview(parsed.preview);
    else setError(t(errorKeys[parsed.code], { detail: parsed.detail ?? "" }));
  };

  const run = async (strategy: ImportStrategy) => {
    if (!preview) return;
    if (strategy === "replace" && !window.confirm(t("confirmReplace"))) return;
    const outcome = await executeImport(
      await dbReady,
      preview.categories,
      strategy,
    );
    setPreview(null);
    setMessage(
      t("importSuccess", {
        a: outcome.addedCategories,
        m: outcome.mergedCategories,
        w: outcome.addedWords,
      }),
    );
    await reload();
  };

  const restore = async () => {
    if (!window.confirm(t("confirmRestore"))) return;
    if (await restoreBackup(await dbReady)) {
      setMessage(t("restored"));
      await reload();
    }
  };

  const download = () => {
    const selected =
      scope === "all"
        ? (categories ?? [])
        : (categories ?? []).filter((c) => c.id === scope);
    const json = exportCategories(selected, { onlyEnabledWords: onlyEnabled });
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "uriheadsup-categories.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="page">
      <a href="#/">← {t("back")}</a>
      <h1>{t("importExportTitle")}</h1>

      <section>
        <h2>{t("importSection")}</h2>
        <label className="btn file-btn">
          {t("chooseFile")}
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>

        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}

        {preview && (
          <div className="preview">
            <p>
              <strong>
                {t("previewSummary", {
                  c: preview.categoryCount,
                  w: preview.wordCount,
                })}
              </strong>
            </p>
            {preview.duplicateNames.length > 0 && (
              <p className="notice">
                {t("duplicateNames", {
                  names: preview.duplicateNames.join(", "),
                })}
              </p>
            )}
            {preview.warnings.length > 0 && (
              <ul className="footnote">
                {preview.warnings.map((w, i) => (
                  <li key={i}>
                    {t(warningKeys[w.code], {
                      category: w.category,
                      n: w.count,
                    })}
                  </li>
                ))}
              </ul>
            )}
            <nav className="stack">
              <button
                className="btn btn-primary"
                onClick={() => void run("add")}
              >
                {t("strategyAdd")}
              </button>
              <button className="btn" onClick={() => void run("merge")}>
                {t("strategyMerge")}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void run("replace")}
              >
                {t("strategyReplace")}
              </button>
            </nav>
          </div>
        )}

        {hasBackup && (
          <p>
            <button className="btn-plain" onClick={() => void restore()}>
              {t("restoreBackup")}
            </button>
          </p>
        )}
      </section>

      <section>
        <h2>{t("exportSection")}</h2>
        <div className="row">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">{t("exportScopeAll")}</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="check">
            <input
              type="checkbox"
              checked={onlyEnabled}
              onChange={(e) => setOnlyEnabled(e.target.checked)}
            />
            {t("onlyEnabledWords")}
          </label>
        </div>
        <button className="btn" onClick={download}>
          {t("download")}
        </button>
      </section>
    </main>
  );
}
