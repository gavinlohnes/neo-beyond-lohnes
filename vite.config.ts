import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { buildInfoDefine } from "./build-info.config.ts";

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
  define: buildInfoDefine(),
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      // Suit Implementation 01B: self-hosted webfonts (src/ui/styles/
      // fonts.ts) are only genuinely "offline-first" if the service
      // worker actually precaches the .woff2 files Vite emits for them —
      // explicit rather than trusting an unverified default glob, since
      // "must actually render offline on the FIELD device" is a hard
      // requirement this checkpoint set out to fix, not a nice-to-have.
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // BRAND-MARK-003: a new cache id so installed phones drop the old icons with the old precache.
        cacheId: "beyond-mark-v3",
        cleanupOutdatedCaches: true,
        // GARMIN-002 SEND TO BEYOND: receives Health Bridge files shared to the installed app.
        importScripts: ["share-target-sw.js"],
      },
      manifest: {
        name: "BEYOND",
        short_name: "BEYOND",
        description: "Personal operating system",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        // BRAND-MARK-003 (Brand Drop v2): the home screen is full-bleed yellow (the OS masks it), "any" is
        // the chamfered plate, "monochrome" is the themed-icon silhouette. Source: docs/brand/beyond-emblem/.
        icons: [
          { src: "icons/beyond-v3-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/beyond-v3-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icons/beyond-v3-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/beyond-v3-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/beyond-v3-512-monochrome.png", sizes: "512x512", type: "image/png", purpose: "monochrome" }
        ],
        // SHORTCUTS-001 (owner brief 2026-10-05): long-press the icon for
        // START WORKOUT, +WATER and LOG MEAL. Each opens straight to that
        // control (src/ui/shortcuts.ts) — none logs or starts anything by itself.
        // GARMIN-002: BEYOND appears in Android's share sheet for Health Bridge files. The service
        // worker (public/share-target-sw.js) parks them and opens the import preview; nothing imports by itself.
        share_target: {
          action: "./share-target",
          method: "POST",
          enctype: "multipart/form-data",
          params: { files: [{ name: "health", accept: ["application/json", ".json"] }] },
        },
        shortcuts: [
          { name: "START WORKOUT", short_name: "START WORKOUT", url: "./?go=workout", icons: [{ src: "icons/beyond-v3-192.png", sizes: "192x192", type: "image/png" }] },
          { name: "+WATER", short_name: "+WATER", url: "./?go=water", icons: [{ src: "icons/beyond-v3-192.png", sizes: "192x192", type: "image/png" }] },
          { name: "LOG MEAL", short_name: "LOG MEAL", url: "./?go=meal", icons: [{ src: "icons/beyond-v3-192.png", sizes: "192x192", type: "image/png" }] }
        ]
      }
    })
  ]
});
