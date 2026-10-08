import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)), publicDir: false, plugins: [react()],
  server: { host: "127.0.0.1", port: 5176, strictPort: true, fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] } },
  preview: { host: "127.0.0.1", port: 5176, strictPort: true },
  build: { outDir: ".output", emptyOutDir: true, copyPublicDir: false },
});
