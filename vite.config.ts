import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/', // ✅ Works with Vercel/static hosting
  plugins: [
    react(),

    // ✅ Removed legacy plugin to fix React 18 `useSyncExternalStore` issues

    visualizer({
      filename: 'dist/bundle-report.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'robots.txt',
        'icon-192.png',
        'icon-512.png',
      ],
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
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@context', replacement: resolve(__dirname, 'src/context') },
      { find: '@types', replacement: resolve(__dirname, 'src/types') },
      { find: '@components', replacement: resolve(__dirname, 'src/features/components') },
      { find: '@supplier', replacement: resolve(__dirname, 'src/features/roles/supplier/components') },
      // ⛔ Removed node_modules aliasing for safety
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    target: 'es2015',
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('zustand')) return 'vendor-zustand';
            if (id.includes('tailwindcss')) return 'vendor-tailwind';
            if (id.includes('jwt-decode')) return 'vendor-auth';
            if (id.includes('react-helmet-async')) return 'vendor-helmet';
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'react-helmet-async',
      'jwt-decode',
    ],
    exclude: ['js-big-decimal'],
  },
});
