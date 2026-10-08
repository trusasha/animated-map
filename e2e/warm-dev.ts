import { chromium } from '@playwright/test';

// Vite re-optimizes deps on the first request after the module graph changes and reloads the page,
// which would otherwise land in the middle of the first dev test
export default async function warmDev() {
  if (!process.env.E2E_WARM_DEV) return;
  const base = `http://127.0.0.1:${process.env.E2E_DEV_PORT ?? '5175'}`;
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? {} : { channel: 'chrome' });
  try {
    const page = await browser.newPage();
    for (const route of ['/', '/ds.html', '/']) {
      await page.goto(base + route);
      await page.waitForLoadState('networkidle');
    }
  } finally {
    await browser.close();
  }
}
