import { expect, test } from '@playwright/test';
import { demoNames, demoSection, openGallery, THEMES, VIEWPORTS, type ViewportName } from './helpers';

const names = demoNames();

test('gallery has demos to capture', () => {
  expect(names.length).toBeGreaterThan(0);
});

for (const viewport of Object.keys(VIEWPORTS) as ViewportName[]) {
  for (const theme of THEMES) {
    test.describe(`${viewport} ${theme}`, () => {
      for (const name of names) {
        test(`${name} matches baseline`, async ({ page }) => {
          await openGallery(page, { theme, viewport });
          const section = demoSection(page, name);
          await section.scrollIntoViewIfNeeded();
          await expect(section).toHaveScreenshot(`${name}-${viewport}-${theme}.png`, {
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.01,
          });
        });
      }
    });
  }
}

for (const theme of THEMES) {
  test(`open Dialog matches baseline in ${theme}`, { tag: '@needs-p1-10a' }, async ({ page }) => {
    await openGallery(page, { theme });
    await demoSection(page, 'Dialog').getByRole('button', { name: 'Open 640' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveScreenshot(`Dialog-open-${theme}.png`, { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 });
  });
}
