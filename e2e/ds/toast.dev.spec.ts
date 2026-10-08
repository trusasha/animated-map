import { expect, test } from '@playwright/test';
import { demoSection, openGallery } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await openGallery(page);
});

test.describe('Toaster', () => {
  test('the 4th toast evicts the oldest', async ({ page }) => {
    const section = demoSection(page, 'Toast');
    for (let i = 0; i < 4; i++) await section.getByRole('button', { name: 'With Undo' }).click();
    await expect(page.getByRole('status')).toHaveCount(3);
  });

  test('an info toast disappears after about 5.5 s', async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Info toast' }).click();
    await expect(page.getByRole('status')).toHaveCount(1);
    await page.clock.fastForward(6000);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('an error toast persists past 6 s', async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Error toast' }).click();
    await page.clock.fastForward(6000);
    await expect(page.getByRole('alert')).toHaveCount(1);
  });

  test('dismiss removes an error toast', async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Error toast' }).click();
    await page.getByRole('alert').getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
