import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project site: served from /neo-beyond-lohnes/, not the
// domain root. Vite rewrites index.html's asset references and the PWA
// plugin's manifest start_url/scope to match this automatically.
export default defineConfig({
  base: "/neo-beyond-lohnes/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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
