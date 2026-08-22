import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project site: served from /neo-beyond-lohnes/, not the
// domain root. Vite rewrites index.html's asset references and the PWA
// plugin's manifest start_url/scope to match this automatically.
//
// Harvest Checkpoint 0: registerType was "autoUpdate", which vite-plugin-
// pwa's own type declarations document as "the new service worker will
// update caches and reload all browser windows/tabs with the application
// open automatically" — a real risk against active, unsaved input (a
// workout mid-set, a check-in half-filled, an unsaved Work Schedule edit).
// "prompt" + injectRegister: null hands control to our own explicit
// SYSTEM UPDATE READY banner (src/app/App.tsx, via the official
// virtual:pwa-register/react hook) instead of auto-reloading silently.
export default defineConfig({
  base: "/neo-beyond-lohnes/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      manifest: {
        name: "BEYOND",
        short_name: "BEYOND",
        description: "Personal operating system",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
