import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: parseInt(process.env.DEPLOY_RUN_PORT || '5000'),
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: true,
      path: '/hot/vite-hmr',
      port: 6000,
      clientPort: 443,
      timeout: 30000,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  build: {
    outDir: 'backend/static',
    emptyOutDir: true,
  },
});
