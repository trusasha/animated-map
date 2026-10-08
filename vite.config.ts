import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  server: { hmr: { port: Number(process.env.HMR_PORT ?? 24678) } },
  // maplibre v6 loads its worker relative to import.meta.url; pre-bundling breaks that path
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
