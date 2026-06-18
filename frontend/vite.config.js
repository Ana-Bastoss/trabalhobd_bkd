import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redireciona /api/... → http://localhost:3000/api/...
      '/api': 'http://localhost:3000',
      // Redireciona /uploads/... → http://localhost:3000/uploads/...
      '/uploads': 'http://localhost:3000'
    }
  }
})