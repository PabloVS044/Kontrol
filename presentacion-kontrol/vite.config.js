import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true },
  preview: { port: 4180 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        presenter: resolve(import.meta.dirname, 'presenter.html'),
      },
    },
  },
})
