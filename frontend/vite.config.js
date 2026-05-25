import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true
      },
      '/socket.io': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true
      }
    }
  }
})
