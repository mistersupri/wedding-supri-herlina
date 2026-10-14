import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // AI Studio sets DISABLE_HMR=true so agent edits do not flicker the preview.
    hmr: process.env.DISABLE_HMR !== 'true',
    // The JSON database and uploads change at runtime; watching them would reload every open page on each RSVP.
    watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/**', '**/uploads/**'] },
  },
});
