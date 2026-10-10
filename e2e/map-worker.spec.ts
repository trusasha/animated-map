import { expect, test } from '@playwright/test';

test('production map loads its worker and finishes loading @map', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?e2e');
  await page.waitForFunction(() => '__ta' in window);
  await page.evaluate(() => (window as unknown as { __ta: { map: { whenLoaded(): Promise<void> } } }).__ta.map.whenLoaded());
  expect(errors.filter((e) => e.includes('Worker'))).toEqual([]);
});
