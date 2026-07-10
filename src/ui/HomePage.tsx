import { useLocale, useT } from "../i18n";
import { enabledWords } from "../domain/types";
import { useInstallPrompt } from "../pwa/install";
import { useFullscreen } from "../pwa/fullscreen";
import { useCategories } from "./data";

export default function HomePage() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const { categories } = useCategories();
  const { canInstall, showIosHint, install } = useInstallPrompt();
  const fullscreen = useFullscreen();

  return (
    <main className="page">
      <header className="stage">
        <div className="stage-top">
          {fullscreen.supported && (
            <button
              className="btn-plain"
              aria-label={t(
                fullscreen.active ? "fullscreenExit" : "fullscreenEnter",
              )}
              title={t(
                fullscreen.active ? "fullscreenExit" : "fullscreenEnter",
              )}
              onClick={fullscreen.toggle}
            >
              {fullscreen.active ? "🗗" : "⛶"}
            </button>
          )}
          <button
            className="btn-plain"
            onClick={() => setLocale(locale === "en" ? "he" : "en")}
          >
            {t("switchLanguage")}
          </button>
        </div>
        <div className="stage-hero">
          <img
            className="hero-img"
            src={`${import.meta.env.BASE_URL}pwa-512.png`}
            alt=""
          />
          <div>
            <h1>{t("appName")}</h1>
            <p className="stage-tagline">{t("tagline")}</p>
          </div>
        </div>
        <div className="howto-pills">
          <span className="pill pill-correct">⬇ {t("correct")}</span>
          <span className="pill pill-skip">⬆ {t("skip")}</span>
        </div>
      </header>

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
                  c.color
                    ? ({ "--cat": c.color } as React.CSSProperties)
                    : undefined
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
        <a className="btn btn-primary" href="#/new">
          + {t("newCategory")}
        </a>
        <a className="btn" href="#/import-export">
          {t("importExport")}
        </a>
        <a className="btn" href="#/settings">
          {t("settings")}
        </a>
        {canInstall && (
          <button className="btn" onClick={install}>
            {t("installApp")}
          </button>
        )}
      </nav>
      {showIosHint && <p className="footnote">{t("iosInstallHint")}</p>}
    </main>
  );
}
