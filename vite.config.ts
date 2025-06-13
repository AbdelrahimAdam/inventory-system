import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

// Enhanced MIME type plugin with proper module type handling
function mimePlugin() {
  return {
    name: 'mime-fix',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (req.url?.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        } else if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    },
    transformIndexHtml(html) {
      return html
        .replace(
          /<script type="module" src="(.*?)"><\/script>/g,
          '<script type="module" src="$1" crossorigin="anonymous"></script>'
        )
        .replace(
          /<link rel="stylesheet" href="(.*?)">/g,
          '<link rel="stylesheet" href="$1" crossorigin="anonymous">'
        );
    }
  };
}

export default defineConfig({
  base: '/',
  plugins: [
    react({
      jsxRuntime: 'automatic',
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    mimePlugin(),
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
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css|html|json)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
              }
            }
          },
          {
            urlPattern: /api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              matchOptions: {
                ignoreSearch: true
              }
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
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@context', replacement: resolve(__dirname, 'src/context') },
      { find: '@types', replacement: resolve(__dirname, 'src/types') },
      { find: '@components', replacement: resolve(__dirname, 'src/features/components') },
      { find: '@supplier', replacement: resolve(__dirname, 'src/features/roles/supplier/components') },
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug']
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-mui';
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('framer-motion')) return 'vendor-animations';
            if (id.includes('zustand') || id.includes('jotai')) return 'vendor-state';
            if (id.includes('axios') || id.includes('jwt-decode')) return 'vendor-network';
            if (id.includes('date-fns') || id.includes('moment')) return 'vendor-dates';
            return 'vendor-other';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        generatedCode: 'es2015',
        hoistTransitiveImports: false
      },
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false
      }
    },
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@emotion/react',
      '@emotion/styled',
      'framer-motion',
      'jwt-decode',
      'zustand'
    ],
    exclude: ['js-big-decimal'],
    esbuildOptions: {
      target: 'esnext',
      supported: {
        'top-level-await': true
      }
    }
  },
  esbuild: {
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  }
});