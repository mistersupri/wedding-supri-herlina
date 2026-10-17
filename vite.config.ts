import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    // AI Studio sets DISABLE_HMR=true so agent edits do not flicker the preview.
    hmr: process.env.DISABLE_HMR !== 'true',
    // Uploads and the embedded database change at runtime; watching them would reload every open page.
    watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/uploads/**', '**/.local-db/**'] },
  },
});
