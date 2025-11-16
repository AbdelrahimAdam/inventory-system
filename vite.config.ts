import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    ...(process.env.NODE_ENV === 'production'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            strategies: 'generateSW',
            includeAssets: ['favicon.svg', 'robots.txt'],
            manifest: {
              name: 'Perfume Inventory',
              short_name: 'Inventory',
              start_url: '/login',
              display: 'standalone',
              background_color: '#ffffff',
              theme_color: '#1f2937',
            },
            workbox: { cleanupOutdatedCaches: true },
          }),
        ]
      : []),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@context': resolve(__dirname, 'src/context'),
      '@manager-ui': resolve(__dirname, 'src/features/roles/manager/ui'), // ✅ Added
    },
  },

  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    hmr: { overlay: false, clientPort: 5173 },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/assets/**',
      ],
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['firebase'], // Exclude firebase to speed up dev server
  },

  cacheDir: 'node_modules/.vite_cache',

  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
});
