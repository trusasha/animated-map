import { globSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
} as const;
export type ViewportName = keyof typeof VIEWPORTS;

export const demoNames = (): string[] =>
  globSync('src/ds/components/*/*.demo.tsx')
    .map((p) => basename(dirname(p)))
    .sort();

export const demoSection = (page: Page, name: string): Locator =>
  page.locator(`section[data-testid="demo-${name}"]`);

type OpenOptions = { theme?: Theme; viewport?: ViewportName };

export async function openGallery(page: Page, { theme = 'light', viewport = 'desktop' }: OpenOptions = {}) {
  await page.setViewportSize(VIEWPORTS[viewport]);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.goto('/ds.html');
  await page.getByTestId('gallery-frame').waitFor();
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
  });
  await page.getByRole('group', { name: 'Theme' }).getByRole('button', { name: theme, exact: true }).click();
  await page.getByRole('group', { name: 'Width' }).getByRole('button', { name: String(VIEWPORTS[viewport].width), exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
}

// @axe-core/playwright resolves its own playwright-core; the runtime Page is compatible
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]['page'];

export async function axeSummary(page: Page) {
  const { violations } = await new AxeBuilder({ page: page as unknown as AxePage }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return violations.map((v) => ({
    rule: v.id,
    targets: v.nodes.map((n) => `${n.target.join(' ')} :: ${n.failureSummary?.split('\n').slice(0, 2).join(' ')}`),
  }));
}

// Playwright's mouse API adds tens of ms between events; CDP timestamps give the page a deterministic fast gesture
export async function flickUp(page: Page, x: number, y: number, distance: number, durationMs = 50) {
  const cdp = await page.context().newCDPSession(page);
  const t0 = Date.now() / 1000;
  const send = (type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', yy: number, at: number) =>
    cdp.send('Input.dispatchMouseEvent', { type, x, y: yy, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, timestamp: t0 + at / 1000 });
  await send('mouseMoved', y, 0);
  await send('mousePressed', y, 10);
  await send('mouseMoved', y - distance / 2, 10 + durationMs / 2);
  await send('mouseMoved', y - distance, 10 + durationMs);
  await send('mouseReleased', y - distance, 10 + durationMs + 10);
  await cdp.detach();
}
