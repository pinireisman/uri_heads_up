import { useLocale, useT } from "../i18n";
import { enabledWords } from "../domain/types";
import { useCategories } from "./data";

export default function HomePage() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { categories } = useCategories();

  return (
    <main className="page">
      <header className="home-header">
        <h1>{t("appName")}</h1>
        <button
          className="btn-plain"
          onClick={() => setLocale(locale === "en" ? "he" : "en")}
        >
          {t("switchLanguage")}
        </button>
      </header>
      <p>{t("howToPlay")}</p>

      {categories && categories.length === 0 && <p>{t("noCategories")}</p>}
      <ul className="card-list">
        {(categories ?? []).map((c) => {
          const playable = enabledWords(c).length;
          return (
            <li key={c.id}>
              <a
                className="card"
                href={`#/category/${encodeURIComponent(c.id)}`}
                style={
                  c.color ? { borderInlineStartColor: c.color } : undefined
                }
              >
                <span className="card-icon" aria-hidden="true">
                  {c.icon}
                </span>
                <span className="card-name">{c.name}</span>
                <span className="card-meta">
                  {t("wordCount", { n: c.words.length })}
                  {playable === 0 && (
                    <span className="badge">{t("emptyBadge")}</span>
                  )}
                  {!c.enabled && (
                    <span className="badge">{t("disabledBadge")}</span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <nav className="home-actions">
        <a className="btn" href="#/new">
          + {t("newCategory")}
        </a>
        <a className="btn" href="#/import-export">
          {t("importExport")}
        </a>
        <a className="btn" href="#/settings">
          {t("settings")}
        </a>
      </nav>
    </main>
  );
}
