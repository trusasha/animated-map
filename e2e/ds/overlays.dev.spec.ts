import { expect, test } from '@playwright/test';
import { demoSection, openGallery } from './helpers';

test.beforeEach(async ({ page }) => {
  await openGallery(page);
});

test.describe('Dialog @pending-p1-06', () => {
  const open = async (page: import('@playwright/test').Page, name: string) => {
    const trigger = demoSection(page, 'Dialog').getByRole('button', { name });
    await trigger.focus();
    await page.keyboard.press('Enter');
    return trigger;
  };

  test('Tab stays inside the open dialog', async ({ page }) => {
    await open(page, 'Open 640');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
  });

  test('Escape closes a dismissible dialog', async ({ page }) => {
    await open(page, 'Open 640');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('focus returns to the trigger after closing', async ({ page }) => {
    const trigger = await open(page, 'Open 640');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  });

  test('Escape is ignored by a non-dismissible dialog', async ({ page }) => {
    await open(page, 'Not dismissible');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Done closes a non-dismissible dialog', async ({ page }) => {
    await open(page, 'Not dismissible');
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});

test.describe('Menu @pending-p1-06', () => {
  const trigger = (page: import('@playwright/test').Page) => demoSection(page, 'Menu').getByRole('button', { name: 'Stop actions' });

  test('ArrowDown from the trigger opens the menu', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('arrows skip the disabled item', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Move down' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeFocused();
  });

  test('Enter runs the focused item and closes the menu', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(demoSection(page, 'Menu')).toContainText('Last: Move up');
  });

  test('Escape closes the menu and returns focus to the trigger', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(trigger(page)).toBeFocused();
  });
});

test.describe('SearchCombobox @pending-p1-06', () => {
  const input = (page: import('@playwright/test').Page) => demoSection(page, 'SearchCombobox').getByRole('combobox', { name: 'Add the next stop' });

  test('ArrowDown then Enter picks the first result', async ({ page }) => {
    await input(page).fill('ber');
    await expect(page.getByRole('option', { name: /Berlin/ })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(demoSection(page, 'SearchCombobox')).toContainText('Picked: Berlin');
  });

  test('the popover is not clipped by the 200px scroller', async ({ page }) => {
    await input(page).fill('b');
    const listbox = page.getByRole('listbox');
    await expect(listbox.getByRole('option')).toHaveCount(6);
    const last = listbox.getByRole('option').last();
    await expect(last).toBeInViewport({ ratio: 1 });
    const scroller = await demoSection(page, 'SearchCombobox').locator('div[style*="overflow"]').boundingBox();
    const box = await listbox.boundingBox();
    expect(box!.y + box!.height).toBeGreaterThan(scroller!.y + scroller!.height);
  });
});

test.describe('BottomSheet @pending-p1-06', () => {
  test('tapping the grabber changes the snap and reported height', async ({ page }) => {
    const section = demoSection(page, 'BottomSheet');
    const readout = section.getByTestId('sheet-height');
    await expect(readout).toContainText('snap collapsed');
    const before = await readout.textContent();
    await section.getByRole('button', { name: 'Resize panel' }).click();
    await expect(readout).not.toHaveText(before!);
  });

  test('the grabber reports expanded state', async ({ page }) => {
    const section = demoSection(page, 'BottomSheet');
    await section.getByRole('button', { name: 'peek' }).click();
    await expect(section.getByRole('button', { name: 'Resize panel' })).toHaveAttribute('aria-expanded', 'false');
  });
});
