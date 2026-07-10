import { useLocale, useT } from "./i18n";

export default function App() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <main className="shell">
      <h1>{t("appName")}</h1>
      <p>{t("tagline")}</p>
      <button onClick={() => setLocale(locale === "en" ? "he" : "en")}>
        {t("switchLanguage")}
      </button>
    </main>
  );
}
