import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // served from https://<user>.github.io/uri_heads_up/
  base: "/uri_heads_up/",
  plugins: [react()],
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"], // e2e is Playwright's
  },
});
