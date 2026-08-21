import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev-only: chuyển /api sang wrangler pages dev (Functions + KV cục bộ)
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
})