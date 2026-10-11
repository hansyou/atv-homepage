import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    proxy: {
      // 本地开发时把 API 代理到 `wrangler dev`
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
