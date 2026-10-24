import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In local dev the frontend runs on :5173 and the API on :5000.
// These proxies let relative "/api" and "/uploads" paths work in dev,
// exactly like Nginx proxies them in the Docker/production build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
