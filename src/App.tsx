import { useEffect, useState } from "react";
import { useLocale, useT } from "./i18n";
import DiagPage from "./ui/DiagPage";

// ponytail: hand-rolled hash routing (D6); add a route table when pages multiply.
function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function Home() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <main className="shell">
      <h1>{t("appName")}</h1>
      <p>{t("tagline")}</p>
      <button onClick={() => setLocale(locale === "en" ? "he" : "en")}>
        {t("switchLanguage")}
      </button>
      <p>
        <a href="#/diag">{t("diagLink")}</a>
      </p>
    </main>
  );
}

export default function App() {
  const hash = useHashRoute();
  return hash === "#/diag" ? <DiagPage /> : <Home />;
}
