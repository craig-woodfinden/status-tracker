import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to XTCON backend (update host for production)
    proxy: {
      '/api': {
        target: process.env.XTCON_HOST || 'http://localhost:3333',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/consumer'),
      },
    },
  },
});
