import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/ws': {
        target: process.env.VITE_API_URL || 'ws://localhost:8080',
        ws: true,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      }
    },
  },
  build: {
    outDir: 'dist', // Standard output for simple hosting
    emptyOutDir: true,
  },
})
