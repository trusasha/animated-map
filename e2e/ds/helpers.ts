import { globSync } from 'node:fs';
import { basename, dirname } from 'node:path';
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
