import { expect, type Locator, type Page } from '@playwright/test';
import { defaultSettings } from '../../fixtures/api';
import { stubNet } from '../../fixtures/net';

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 700;

/** network stubs and default settings every flow starts from */
/** network stubs only, for flows that use the real settings endpoint */
export const stubbed = (page: Page) => stubNet(page);

export async function prepare(page: Page) {
  await stubNet(page);
  await defaultSettings(page);
}

export const mapCanvas = (page: Page) => page.getByTestId('map-host').locator('canvas.maplibregl-canvas');

export async function openHome(page: Page) {
  await page.goto('/?ui=next&e2e');
  await expect(page.getByTestId('home-screen')).toBeVisible();
}

export async function openEditor(page: Page, tripId: string) {
  await page.goto(`/trip/${tripId}?ui=next&e2e`);
  await expect(page.getByTestId('editor-shell')).toBeVisible();
}

/** the map style and sources are loaded and the test probe is exposed */
export async function mapIdle(page: Page) {
  await page.waitForFunction(() => '__ta' in window);
  await page.evaluate(() => (window as unknown as { __ta: { map: { whenLoaded(): Promise<void> } } }).__ta.map.whenLoaded());
}

export const cameraPadding = (page: Page) =>
  page.evaluate(() => (window as unknown as { __ta: { padding?: { top: number; bottom: number; left: number; right: number } } }).__ta.padding);

export const header = (page: Page) => page.getByRole('banner');

export async function openSettings(page: Page): Promise<Locator> {
  await header(page).getByRole('button', { name: /^(Настройки|Settings)$/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/** a slot that is either its real feature (dialog by role) or, until its WP merges, the placeholder box */
export const dialogOrPlaceholder = (page: Page, placeholder: string) =>
  page.getByRole('dialog').or(page.locator(`[data-placeholder="${placeholder}"]`));
