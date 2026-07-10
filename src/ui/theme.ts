import type { Theme } from "../domain/settings";

/** `color-scheme: light dark` is the stylesheet default (follow the OS);
 * an explicit choice pins the root to one scheme. */
export function applyTheme(theme: Theme): void {
  document.documentElement.style.colorScheme = theme === "system" ? "" : theme;
}
