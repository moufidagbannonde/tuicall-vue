import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '^/openapi/interactive/websocket': {
        target: 'wss://avatar-ia.vippinterstis.com:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/openapi': {
        target: 'https://avatar-ia.vippinterstis.com:3000',
        changeOrigin: true,
        secure: false
      },
      '/avatar-socket': {
        target: 'wss://avatar-ia.vippinterstis.com:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/avatar-socket/, '')
      }
    }
  }
})
