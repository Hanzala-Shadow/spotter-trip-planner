import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:8000' } },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          map: ['leaflet'],
          ui: ['@mui/material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
  test: { include: ['src/**/*.test.{ts,tsx}'] },
});
