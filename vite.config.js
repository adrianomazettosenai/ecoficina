import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    watch: {
      ignored: ['**/*.mp4', '**/iveco_animacao.*'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        scanner: resolve(import.meta.dirname, 'scanner/index.html'),
      },
    },
  },
});
