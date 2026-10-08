import { defineConfig, type Project } from '@playwright/test';
import wipeE2eData from './e2e/global-setup';

// webServers start before globalSetup would run, so the wipe happens at config load in the runner only
if (!process.env.TEST_WORKER_INDEX) wipeE2eData();

const PROD_PORT = process.env.E2E_PORT ?? '5174';
const DEV_PORT = process.env.E2E_DEV_PORT ?? '5175';
const HMR_PORT = process.env.E2E_HMR_PORT ?? '24679';
const PROD = `http://127.0.0.1:${PROD_PORT}`;
const DEV = `http://127.0.0.1:${DEV_PORT}`;

const sizes = {
  desktop: { viewport: { width: 1440, height: 900 } },
  'tablet-l': { viewport: { width: 1024, height: 768 } },
  'tablet-p': { viewport: { width: 768, height: 1024 } },
  phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};
const MAP_PROJECTS = ['desktop-light', 'phone-light'];

const projects: Project[] = Object.entries(sizes).flatMap(([size, device]) =>
  (['light', 'dark'] as const).map((colorScheme) => {
    const name = `${size}-${colorScheme}`;
    return {
      name,
      testIgnore: '**/*.dev.spec.ts',
      grepInvert: MAP_PROJECTS.includes(name) ? undefined : /@map/,
      use: { ...device, colorScheme, baseURL: PROD },
    };
  }),
);
projects.push({ name: 'dev', testMatch: '**/*.dev.spec.ts', grepInvert: process.env.RECORD ? undefined : /@record/, use: { ...sizes.desktop, colorScheme: 'light', baseURL: DEV } });

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 4,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...(process.env.PW_CHROMIUM ? {} : { channel: 'chrome' }),
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    trace: 'retain-on-failure',
  },
  projects,
  webServer: [
    {
      command: 'npm run build && tsx server/index.ts',
      url: `${PROD}/api/config`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { NODE_ENV: 'production', PORT: PROD_PORT, DATA_DIR: `.e2e-data-${PROD_PORT}`, DATABASE_URL: '' },
    },
    {
      command: 'tsx server/index.ts',
      url: `${DEV}/api/config`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { NODE_ENV: 'development', PORT: DEV_PORT, HMR_PORT, DATA_DIR: `.e2e-data-dev-${DEV_PORT}`, DATABASE_URL: '' },
    },
  ],
});
