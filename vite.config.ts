import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Cuy Azuayito — Trazabilidad COOPAGCUY",
        short_name: "Cuy Azuayito",
        description: "Sistema de trazabilidad digital de la cadena de valor del cuy — COOPAGCUY",
        theme_color: "#16a34a",
        background_color: "#f0fdf4",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/dashboard",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // No cachear las rutas de la API ni la página pública del QR,
        // ya que dependen de datos en tiempo real
        navigateFallbackDenylist: [/^\/api\//, /^\/qr\//],
        runtimeCaching: [
          {
            // Cachear assets estáticos del propio frontend
            urlPattern: /\.(?:png|jpg|jpeg|svg|woff2?)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: {
        enabled: true, // permite probar el service worker en modo dev
      },
    }),
  ],
});