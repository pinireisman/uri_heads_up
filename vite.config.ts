import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // served from https://<user>.github.io/uri_heads_up/
  base: "/uri_heads_up/",
  plugins: [react()],
});
