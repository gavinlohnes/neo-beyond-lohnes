import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const repository = fileURLToPath(new URL("../..", import.meta.url));

// Separate entry, output and origin. Never import the production Vite/PWA config.
export default defineConfig({
  root,
  publicDir: false,
  base: "/",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5174, strictPort: true, fs: { allow: [repository] } },
  preview: { host: "127.0.0.1", port: 5174, strictPort: true },
  build: { outDir: ".output", emptyOutDir: true, copyPublicDir: false, rolldownOptions: { input: { prototype: fileURLToPath(new URL("index.html", import.meta.url)), comparison: fileURLToPath(new URL("comparison.html", import.meta.url)) } } },
});
