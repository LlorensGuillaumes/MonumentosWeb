import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // We already have public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        runtimeCaching: [
          {
            // Cache API calls for monument details (offline viewing)
            urlPattern: /\/api\/monumentos\/\d+$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'monument-details',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
            },
          },
          {
            // Cache images from wikimedia/wikidata
            urlPattern: /^https:\/\/.*\.(wikimedia|wikipedia)\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wiki-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Cache search results briefly
            urlPattern: /\/api\/monumentos\?/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'search-results',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
        ],
      },
    }),
  ],
})
