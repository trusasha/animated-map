import { expect, test } from '@playwright/test';
import { demoSection, openGallery } from './helpers';

test.beforeEach(async ({ page }) => {
  await openGallery(page);
});

test.describe('Dialog', () => {
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
    await expect(dialog.locator(':focus')).toHaveCount(1);
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const where = await dialog.evaluate((d) => `${d.contains(document.activeElement)} ${document.activeElement?.tagName} ${document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.slice(0, 20)}`);
      expect(where, `tab ${i}`).toMatch(/^true/);
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

test.describe('Menu', () => {
  const trigger = (page: import('@playwright/test').Page) => demoSection(page, 'Menu').getByRole('button', { name: 'Stop actions' });

  test('ArrowDown from the trigger opens the menu', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('ArrowDown and ArrowUp move focus between items', async ({ page }) => {
    await trigger(page).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Move down' })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('menuitem', { name: 'Move up' })).toBeFocused();
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

test.describe('SearchCombobox', () => {
  const input = (page: import('@playwright/test').Page) => demoSection(page, 'SearchCombobox').getByRole('combobox', { name: 'Add the next stop' });

  test('Enter picks the auto-highlighted first result', async ({ page }) => {
    await input(page).fill('ber');
    await expect(page.getByRole('option', { name: /Berlin/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(demoSection(page, 'SearchCombobox')).toContainText('Picked: Berlin');
  });

  test('ArrowDown then Enter picks the second result', async ({ page }) => {
    await input(page).fill('ber');
    await expect(page.getByRole('option', { name: /Berlin/ })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(demoSection(page, 'SearchCombobox')).toContainText('Picked: Bern');
  });

  test('the popover is rendered outside the 200px scroller and fully visible', async ({ page }) => {
    await input(page).fill('b');
    const options = page.getByRole('listbox').getByRole('option');
    await expect(options).toHaveCount(6);
    await expect(demoSection(page, 'SearchCombobox').locator('div[style*="overflow"] [role="listbox"]')).toHaveCount(0);
    await expect(options.last()).toBeInViewport({ ratio: 1 });
  });
});

test.describe('BottomSheet', () => {
  test('tapping the grabber changes the snap and reported height', async ({ page }) => {
    const section = demoSection(page, 'BottomSheet');
    const readout = section.getByTestId('sheet-height');
    await expect(readout).toContainText('snap collapsed');
    const before = await readout.textContent();
    await section.getByRole('button', { name: 'Collapse panel' }).click();
    await expect(readout).not.toHaveText(before!);
  });

  test('the grabber name follows the state', async ({ page }) => {
    const section = demoSection(page, 'BottomSheet');
    await section.getByRole('button', { name: 'peek' }).click();
    await expect(section.getByRole('button', { name: 'Expand panel' })).toBeVisible();
  });
});
