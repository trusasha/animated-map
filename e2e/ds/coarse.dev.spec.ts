import { expect, test } from '@playwright/test';
import { axeSummary, demoSection, openGallery, THEMES } from './helpers';

// real touch emulation: coarse sizes must apply from the media query alone, without the gallery toggle
test.use({ hasTouch: true, isMobile: true });

const COARSE_DEMOS = ['IconButton', 'Slider', 'Segmented', 'ListRow', 'ColorSwatchPicker', 'RangeRail', 'Switch'];

test('touch emulation switches the hit tokens without html[data-coarse] being forced', async ({ page }) => {
  await openGallery(page, { viewport: 'phone' });
  const read = () =>
    page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return { icon: s.getPropertyValue('--hit-icon').trim(), rail: s.getPropertyValue('--hit-rail').trim(), coarse: matchMedia('(pointer: coarse)').matches };
    });
  expect(await read()).toEqual({ icon: '40px', rail: '24px', coarse: true });
  await expect(demoSection(page, 'IconButton').getByRole('button').first()).toHaveCSS('width', '40px');
});

for (const theme of THEMES) {
  test(`coarse gallery has no axe violations in ${theme} theme`, async ({ page }) => {
    await openGallery(page, { theme, viewport: 'phone' });
    expect(await axeSummary(page)).toEqual([]);
  });

  for (const name of COARSE_DEMOS) {
    test(`${name} coarse matches baseline in ${theme}`, async ({ page }) => {
      await openGallery(page, { theme, viewport: 'phone' });
      const section = demoSection(page, name);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveScreenshot(`${name}-coarse-${theme}.png`, { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 });
    });
  }
}
