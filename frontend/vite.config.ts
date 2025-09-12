import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Identity Verification dApp',
        short_name: 'Identity dApp',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        description: 'Blockchain identity verification with zk support',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.browser': true,
    Buffer: 'Buffer',
    'global.Buffer': 'Buffer'
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {
          buffer: 'Buffer'
        }
      }
    }
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      fs: 'browserify-fs',
      path: 'path-browserify',
      stream: 'stream-browserify',
      util: 'util'
    }
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'util',
      'stream-browserify',
      'path-browserify',
      'crypto-js',
      'tesseract.js',
      'pdf-parse'
    ]
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

