import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // maplibre v6 loads its worker relative to import.meta.url; pre-bundling breaks that path
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
