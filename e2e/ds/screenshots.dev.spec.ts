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
