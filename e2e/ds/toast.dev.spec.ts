import { expect, test } from '@playwright/test';
import { demoSection, openGallery } from './helpers';

const toaster = (page: import('@playwright/test').Page) => page.locator('[data-placement]');

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await openGallery(page);
});

test.describe('Toaster', () => {
  test('the 4th toast evicts the oldest one', async ({ page }) => {
    const section = demoSection(page, 'Toast');
    await section.getByRole('button', { name: 'Error toast' }).click();
    await section.getByRole('button', { name: 'Info toast' }).click();
    await section.getByRole('button', { name: 'With Undo' }).click();
    await expect(toaster(page).getByText('Couldn’t find a route')).toBeVisible();
    await section.getByRole('button', { name: 'Info toast' }).click();
    await expect(toaster(page).getByText('Couldn’t find a route')).toHaveCount(0);
    await expect(toaster(page).getByText('Stop deleted.')).toHaveCount(1);
    await expect(toaster(page).getByText('Route replaced with 4 stops.')).toHaveCount(2);
  });

  test('Undo runs its callback and dismisses the toast', { tag: '@needs-p1-10a' }, async ({ page }) => {
    const section = demoSection(page, 'Toast');
    await section.getByRole('button', { name: 'With Undo' }).click();
    await toaster(page).getByRole('button', { name: 'Undo' }).click();
    await expect(toaster(page).getByText('Stop deleted.')).toHaveCount(0);
    await expect(section.getByTestId('toast-action-log')).toHaveText('Undo');
  });

  test('hovering a toast pauses its timer', { tag: '@needs-p1-10a' }, async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Info toast' }).click();
    const toast = toaster(page).getByRole('status');
    await toast.hover();
    await page.clock.fastForward(8000);
    await expect(toast).toHaveCount(1);
    await page.mouse.move(0, 0);
    await page.clock.fastForward(6000);
    await expect(toast).toHaveCount(0);
  });

  test('an info toast disappears after about 5.5 s', async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Info toast' }).click();
    await expect(toaster(page).getByRole('status')).toHaveCount(1);
    await page.clock.fastForward(6000);
    await expect(toaster(page).getByRole('status')).toHaveCount(0);
  });

  test('an error toast persists past 6 s', async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Error toast' }).click();
    await page.clock.fastForward(6000);
    await expect(toaster(page).getByRole('alert')).toHaveCount(1);
  });

  test('dismiss removes an error toast', async ({ page }) => {
    await demoSection(page, 'Toast').getByRole('button', { name: 'Error toast' }).click();
    await toaster(page).getByRole('alert').getByRole('button', { name: 'Dismiss' }).click();
    await expect(toaster(page).getByRole('alert')).toHaveCount(0);
  });
});
