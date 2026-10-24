import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const proxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000'

const VENDOR_CHUNKS = ['ogl', 'gsap', 'lenis']

export function manualChunks(id) {
  if (!id.includes('/node_modules/')) return undefined
  // En un solo chunk, three pasa de los 500 kB del aviso de Vite.
  if (id.includes('/node_modules/three/build/three.core')) return 'vendor-three-core'
  if (id.includes('/node_modules/three/')) return 'vendor-three'
  const lib = VENDOR_CHUNKS.find((name) => id.includes(`/node_modules/${name}/`))
  return lib ? `vendor-${lib}` : undefined
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks
      }
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
