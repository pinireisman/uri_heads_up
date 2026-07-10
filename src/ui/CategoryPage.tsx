import { useT } from "../i18n";
import { enabledWords } from "../domain/types";
import { useCategory } from "./data";

export default function CategoryPage({ id }: { id: string }) {
  const t = useT();
  const category = useCategory(id);

  if (category === undefined) return null;
  if (category === null) {
    return (
      <main className="page">
        <a href="#/">{t("back")}</a>
      </main>
    );
  }

  const playable = enabledWords(category).length;
  return (
    <main className="page">
      <a href="#/">← {t("back")}</a>
      <h1>
        <span aria-hidden="true">{category.icon}</span> {category.name}
      </h1>
      {category.description && <p>{category.description}</p>}
      <p>{t("enabledWordCount", { n: playable })}</p>
      {playable === 0 && <p className="notice">{t("cannotStartEmpty")}</p>}
      <nav className="stack">
        <a
          className={`btn btn-primary${playable === 0 ? " btn-disabled" : ""}`}
          href={playable === 0 ? undefined : `#/play/${encodeURIComponent(id)}`}
          aria-disabled={playable === 0}
        >
          {t("startRound")}
        </a>
        <a className="btn" href={`#/edit/${encodeURIComponent(id)}`}>
          {t("editCategory")}
        </a>
      </nav>
    </main>
  );
}
