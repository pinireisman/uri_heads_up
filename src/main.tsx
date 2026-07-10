import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LocaleProvider } from "./i18n";
import App from "./App.tsx";
import { getDb } from "./persistence/db";
import { seedIfNeeded } from "./persistence/seed";
import "./index.css";

void getDb().then(seedIfNeeded);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleProvider>
      <App />
    </LocaleProvider>
  </StrictMode>,
);
