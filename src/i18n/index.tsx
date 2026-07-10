import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { en, type MessageKey } from "./en";
import { he } from "./he";

export type Locale = "en" | "he";

const dicts: Record<Locale, Record<MessageKey, string>> = { en, he };
const dirs: Record<Locale, "ltr" | "rtl"> = { en: "ltr", he: "rtl" };
const STORAGE_KEY = "uhu.locale";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleState | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    localStorage.getItem(STORAGE_KEY) === "he" ? "he" : "en",
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirs[locale];
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleState {
  const state = useContext(LocaleContext);
  if (!state) throw new Error("useLocale must be used inside <LocaleProvider>");
  return state;
}

export function useT(): (key: MessageKey) => string {
  const { locale } = useLocale();
  return (key) => dicts[locale][key];
}
