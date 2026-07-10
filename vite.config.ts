import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  // served from https://<user>.github.io/uri_heads_up/
  base: "/uri_heads_up/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "UriHeadsUp",
        short_name: "UriHeadsUp",
        description: "Forehead word-guessing party game",
        display: "standalone",
        orientation: "landscape", // FR-13: preference only, portrait still handled
        theme_color: "#4f7cac",
        background_color: "#2c4f75",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}"], // full offline shell (FR-11)
      },
    }),
  ],
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"], // e2e is Playwright's
  },
});
