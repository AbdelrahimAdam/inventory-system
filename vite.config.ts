import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  appType: 'spa', // 👈 Ensures all routes fallback to index.html
  base: '/',
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    visualizer({
      filename: 'dist/bundle-report.html',
      open: process.env.NODE_ENV === 'development',
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'robots.txt', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'نظام مخزون العطور',
        short_name: 'المخزون',
        description: 'نظام إدارة مخزون العطور الاحترافي',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1f2937',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css|html|json)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60 }
            }
          }
        ]
      },
      devOptions: {
        enabled: process.env.SW_DEV === 'true',
        type: 'module',
        navigateFallback: 'index.html'
      }
    }),
    {
      name: 'jotai-resolver',
      resolveId(source) {
        if (source === 'jotai/vanilla.js') {
          return { id: '\0jotai-stub', external: false };
        }
      },
      load(id) {
        if (id === '\0jotai-stub') {
          return 'export default {}';
        }
      }
    }
  ],
  resolve: {
    alias: [
      { find: '@context/AuthContext', replacement: resolve(__dirname, 'src/context/AuthContext.tsx') },
      { find: 'axios', replacement: resolve(__dirname, 'node_modules/axios/index.js') },
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@types', replacement: resolve(__dirname, 'src/types') },
      { find: '@components', replacement: resolve(__dirname, 'src/features/components') },
      { find: '@supplier', replacement: resolve(__dirname, 'src/features/roles/supplier/components') },
    ],
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    mainFields: ['browser', 'module', 'main']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: { protocol: 'ws', host: 'localhost' },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
      format: { comments: false }
    },
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'PURE_COMMENT' || warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          emotion: ['@emotion/react', '@emotion/styled'],
          router: ['react-router-dom'],
          state: ['zustand'],
          http: ['axios'],
          ui: ['react-helmet-async']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
    commonjsOptions: { transformMixedEsModules: true }
  },
    optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      'react-router-dom',
      'react-helmet-async',
      'zustand',
      'axios',
      'use-sync-external-store'
    ],
    exclude: ['jotai'],
    esbuildOptions: {
      target: 'esnext',
      legalComments: 'none',
      supported: { 'top-level-await': true }
    }
  }
}); 
