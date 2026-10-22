import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** which code a visit ran: telemetry tags every session with it */
function commit() {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return process.env.KOYEB_GIT_SHA?.slice(0, 7) ?? 'unknown'; }
}

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify({ commit: commit(), at: new Date().toISOString() }) },
  css: { modules: { localsConvention: 'camelCaseOnly' } },
  server: { hmr: { port: Number(process.env.HMR_PORT ?? 24678) } },
  // maplibre v6 loads its worker relative to import.meta.url; pre-bundling breaks that path
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
