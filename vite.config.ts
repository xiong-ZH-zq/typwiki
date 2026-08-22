// vite.config.ts
// Vite only builds the client-side assets for the generated static site:
// the hydration entry (`src/client/entry.tsx`) and the Tailwind stylesheet
// (`src/styles/index.css`). The article pages themselves are server-rendered
// by the build pipeline (tsx + React renderToString), so Vite never sees them.
//
// Output filenames are fixed (no content hashes) because the generated HTML
// references them by name and the build must be reproducible.
//
// - `emptyOutDir: false` keeps the rest of `public/` (generated pages, theme
//   assets) intact when Vite cleans its own output directory.
// - `outDir` is `public/assets` so every asset lives under one stable path.

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "public/assets",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        client: "src/client/entry.tsx",
        styles: "src/styles/index.css",
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
