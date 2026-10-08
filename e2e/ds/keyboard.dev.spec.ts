import { expect, test } from '@playwright/test';
import { demoSection, openGallery } from './helpers';

test.beforeEach(async ({ page }) => {
  await openGallery(page);
});

test.describe('Segmented', () => {
  test('ArrowRight selects the next option', async ({ page }) => {
    const group = demoSection(page, 'Segmented').getByRole('radiogroup', { name: 'Travel by' });
    await group.getByRole('radio', { name: 'Land' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Water' })).toBeChecked();
  });

  test('ArrowLeft selects the previous option', async ({ page }) => {
    const group = demoSection(page, 'Segmented').getByRole('radiogroup', { name: 'Travel by' });
    await group.getByRole('radio', { name: 'Land' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(group.getByRole('radio', { name: 'Air' })).toBeChecked();
  });

  test('arrows skip a disabled option', async ({ page }) => {
    const group = demoSection(page, 'Segmented').getByRole('radiogroup', { name: 'Two options, one disabled' });
    await group.getByRole('radio', { name: 'Fast' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Fast' })).toBeChecked();
  });
});

test.describe('Slider', () => {
  const thumb = (page: import('@playwright/test').Page) => demoSection(page, 'Slider').getByRole('slider', { name: 'Length' });

  test('ArrowRight increases by one step', async ({ page }) => {
    await thumb(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(thumb(page)).toHaveAttribute('aria-valuenow', '13');
  });

  test('ArrowLeft decreases by one step', async ({ page }) => {
    await thumb(page).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(thumb(page)).toHaveAttribute('aria-valuenow', '11');
  });

  test('PageUp increases by a large step', async ({ page }) => {
    await thumb(page).focus();
    await page.keyboard.press('PageUp');
    await expect(thumb(page)).toHaveAttribute('aria-valuenow', '22');
  });

  test('Home jumps to the minimum', async ({ page }) => {
    await thumb(page).focus();
    await page.keyboard.press('Home');
    await expect(thumb(page)).toHaveAttribute('aria-valuenow', '5');
  });

  test('End jumps to the maximum', async ({ page }) => {
    await thumb(page).focus();
    await page.keyboard.press('End');
    await expect(thumb(page)).toHaveAttribute('aria-valuenow', '60');
  });
});

test.describe('Switch', () => {
  test('Space toggles an unlocked switch', async ({ page }) => {
    const sw = demoSection(page, 'Switch').getByRole('switch', { name: 'Trip name' });
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  test('Space leaves a locked switch unchanged', async ({ page }) => {
    const sw = demoSection(page, 'Switch').getByRole('switch', { name: 'Map attribution' });
    await sw.focus();
    await page.keyboard.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  test('a locked switch stays focusable', async ({ page }) => {
    const sw = demoSection(page, 'Switch').getByRole('switch', { name: 'Map attribution' });
    await sw.focus();
    await expect(sw).toBeFocused();
  });
});

test.describe('Select', () => {
  const trigger = (page: import('@playwright/test').Page) => demoSection(page, 'Select').getByRole('combobox', { name: 'Figure', exact: true });

  test('ArrowDown opens the list', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox').getByRole('option', { name: 'Wooden boat' })).toBeVisible();
  });

  test('ArrowDown then Enter picks the next option and closes the list', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: 'Steam train', selected: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox').getByRole('option', { name: 'Wooden boat' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(trigger(page)).toContainText('Wooden boat');
  });

  test('Escape closes the list and returns focus to the trigger', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
});

test.describe('RangeRail', () => {
  const handle = (page: import('@playwright/test').Page, name: string) =>
    demoSection(page, 'RangeRail').getByRole('slider', { name });
  const START = 'Drag to change where the video starts';
  const END = 'Drag to change where the video ends';

  test('ArrowDown moves the start handle one row down', async ({ page }) => {
    await handle(page, START).focus();
    await page.keyboard.press('ArrowDown');
    await expect(handle(page, START)).toHaveAttribute('aria-valuetext', 'Cairo');
  });

  test('ArrowUp moves the end handle one row up', async ({ page }) => {
    await handle(page, END).focus();
    await page.keyboard.press('ArrowUp');
    await expect(handle(page, END)).toHaveAttribute('aria-valuetext', 'Nairobi');
  });

  test('Home moves the start handle to the first row', async ({ page }) => {
    await handle(page, START).focus();
    await page.keyboard.press('Home');
    await expect(handle(page, START)).toHaveAttribute('aria-valuetext', 'Moscow');
  });

  test('End moves the end handle to the last row', async ({ page }) => {
    await handle(page, END).focus();
    await page.keyboard.press('End');
    await expect(handle(page, END)).toHaveAttribute('aria-valuetext', 'Lisbon');
  });

  test('the start handle cannot pass the end handle', async ({ page }) => {
    await handle(page, START).focus();
    await page.keyboard.press('End');
    await expect(handle(page, START)).toHaveAttribute('aria-valuenow', '3');
  });
});
