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
    // El escaner de codigo de barras necesita getUserMedia, que solo existe en
    // contexto seguro: por IP de LAN en http no hay camara. Para probar desde el
    // celular hay que exponer el dev server por un tunel https, y Vite 6 rechaza
    // con 403 cualquier Host que no este aqui. Solo aplica al server de desarrollo.
    allowedHosts: [
      '.devtunnels.ms',      // VS Code / GitHub port forwarding
      '.trycloudflare.com',  // cloudflared quick tunnel
      '.ngrok-free.app',
      '.ngrok.io',
    ],
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
