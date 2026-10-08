import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openGallery, THEMES } from './helpers';

// @axe-core/playwright resolves its own playwright-core; the runtime Page is compatible
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];

for (const theme of THEMES) {
  test(`gallery has no axe violations in ${theme} theme`, async ({ page }) => {
    await openGallery(page, { theme });
    const { violations } = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const summary = violations.map((v) => ({
      rule: v.id,
      targets: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(0, 2).join(' ')}`),
    }));
    expect(summary).toEqual([]);
  });
}
