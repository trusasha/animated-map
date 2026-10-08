import { defineConfig, type Project } from '@playwright/test';
import wipeE2eData from './e2e/global-setup';

// webServers start before globalSetup would run, so the wipe happens at config load in the runner only
if (!process.env.TEST_WORKER_INDEX) wipeE2eData();

// each worktree/WP picks its own ports, e.g. E2E_PORT=5181 E2E_DEV_PORT=5182 E2E_HMR_PORT=24682
const PROD_PORT = process.env.E2E_PORT ?? '5174';
const DEV_PORT = process.env.E2E_DEV_PORT ?? '5175';
const HMR_PORT = process.env.E2E_HMR_PORT ?? '24679';
const PROD = `http://127.0.0.1:${PROD_PORT}`;
const DEV = `http://127.0.0.1:${DEV_PORT}`;

// only the servers the selected --project flags need are started; no flag starts both
const argv = process.argv.slice(2);
const selected = argv.flatMap((a, i) => (a.startsWith('--project=') ? [a.slice('--project='.length)] : a === '--project' && argv[i + 1] ? [argv[i + 1]] : []));
const needProd = selected.length === 0 || selected.some((p) => p !== 'dev');
const needDev = selected.length === 0 || selected.includes('dev');
if (needDev) process.env.E2E_WARM_DEV = '1';

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
      // server routes and the ~6 min software-GL export run don't depend on viewport or theme: one project only
      testIgnore: name === 'desktop-light' ? '**/*.dev.spec.ts' : ['**/*.dev.spec.ts', '**/server.spec.ts', '**/export-smoke.spec.ts', '**/flows/settings.spec.ts'],
      grepInvert: [/@needs-p3-04/, ...(MAP_PROJECTS.includes(name) ? [] : [/@map/]), ...(size === 'phone' ? [/@no-phone/] : [])],
      use: { ...device, colorScheme, baseURL: PROD },
    };
  }),
);
const devGrepInvert = [...(process.env.RECORD ? [] : [/@record/]), ...(process.env.NEEDS_P1_10A ? [] : [/@needs-p1-10a/])];
projects.push({ name: 'dev', testMatch: '**/*.dev.spec.ts', grepInvert: devGrepInvert.length ? devGrepInvert : undefined, use: { ...sizes.desktop, colorScheme: 'light', baseURL: DEV } });

export default defineConfig({
  testDir: 'e2e',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',
  globalSetup: './e2e/warm-dev.ts',
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
    ...(needProd
      ? [{
          command: 'npm run build && tsx server/index.ts',
          url: `${PROD}/api/config`,
          reuseExistingServer: false,
          timeout: 180_000,
          env: { NODE_ENV: 'production', PORT: PROD_PORT, DATA_DIR: `.e2e-data-${PROD_PORT}`, DATABASE_URL: '' },
        }]
      : []),
    ...(needDev
      ? [{
          command: 'tsx server/index.ts',
          url: `${DEV}/api/config`,
          reuseExistingServer: false,
          timeout: 60_000,
          env: { NODE_ENV: 'development', PORT: DEV_PORT, HMR_PORT, DATA_DIR: `.e2e-data-${DEV_PORT}`, DATABASE_URL: '' },
        }]
      : []),
  ],
});
