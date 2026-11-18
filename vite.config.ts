import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Em desenvolvimento o Vite serve o cliente e encaminha /api para o Fastify.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist/client', emptyOutDir: true },
  server: {
    port: 5380,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8381' },
  },
  test: { include: ['tests/**/*.test.ts'] },
});
