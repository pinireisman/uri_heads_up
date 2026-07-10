import { useEffect, useState } from "react";
import DiagPage from "./ui/DiagPage";
import HomePage from "./ui/HomePage";
import CategoryPage from "./ui/CategoryPage";
import EditorPage from "./ui/EditorPage";
import ImportExportPage from "./ui/ImportExportPage";
import SettingsPage from "./ui/SettingsPage";
import PlayPage from "./ui/PlayPage";
import ResultsPage from "./ui/ResultsPage";

type Route =
  | { name: "home" }
  | { name: "diag" }
  | { name: "category"; id: string }
  | { name: "edit"; id: string }
  | { name: "new" }
  | { name: "import-export" }
  | { name: "settings" }
  | { name: "play"; id: string }
  | { name: "results" };

// ponytail: hand-rolled hash routing (D6) — a route table lib buys nothing here.
function parseRoute(hash: string): Route {
  const [head, tail] = hash.replace(/^#\/?/, "").split("/", 2);
  const id = tail ? decodeURIComponent(tail) : "";
  switch (head) {
    case "diag":
      return { name: "diag" };
    case "category":
      return id ? { name: "category", id } : { name: "home" };
    case "edit":
      return id ? { name: "edit", id } : { name: "home" };
    case "new":
      return { name: "new" };
    case "import-export":
      return { name: "import-export" };
    case "settings":
      return { name: "settings" };
    case "play":
      return id ? { name: "play", id } : { name: "home" };
    case "results":
      return { name: "results" };
    default:
      return { name: "home" };
  }
}

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  const route = parseRoute(hash);
  switch (route.name) {
    case "diag":
      return <DiagPage />;
    case "category":
      return <CategoryPage key={hash} id={route.id} />;
    case "edit":
      return <EditorPage key={hash} id={route.id} />;
    case "new":
      return <EditorPage key={hash} />;
    case "import-export":
      return <ImportExportPage />;
    case "settings":
      return <SettingsPage />;
    case "play":
      return <PlayPage key={hash} id={route.id} />;
    case "results":
      return <ResultsPage />;
    default:
      return <HomePage />;
  }
}
