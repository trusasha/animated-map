import { expect, test } from '@playwright/test';
import { axeSummary, demoSection, openGallery, THEMES } from './helpers';

for (const theme of THEMES) {
  test(`gallery has no axe violations in ${theme} theme`, async ({ page }) => {
    await openGallery(page, { theme });
    expect(await axeSummary(page)).toEqual([]);
  });

  test(`an open Dialog has no axe violations in ${theme} theme`, async ({ page }) => {
    await openGallery(page, { theme });
    await demoSection(page, 'Dialog').getByRole('button', { name: 'Open 640' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await axeSummary(page)).toEqual([]);
  });

  test(`an open danger ConfirmDialog has no axe violations in ${theme} theme`, { tag: '@needs-p1-10a' }, async ({ page }) => {
    await openGallery(page, { theme });
    await demoSection(page, 'ConfirmDialog').getByRole('button', { name: 'Danger confirm' }).click();
    await expect(page.getByRole('alertdialog').or(page.getByRole('dialog'))).toBeVisible();
    expect(await axeSummary(page)).toEqual([]);
  });
}
