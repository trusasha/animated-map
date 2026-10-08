import { expect, test, type Page } from '@playwright/test';
import { stubNet } from '../fixtures/net';

const EMPTY = { stops: [], style: 'satellite', speed: 1, format: '9:16' };
const at = (id: string, name: string, lng: number, lat: number, leg?: object) => ({ id, name, lng, lat, ...(leg && { leg }) });
const SEED = [
  at('a', 'Paris', 2.35, 48.85),
  at('b', 'Berlin', 13.4, 52.5, { mode: 'air', figure: 'airplane' }),
  at('c', 'Rome', 12.5, 41.9, { mode: 'ground', figure: 'car' }),
];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stubNet(page);
  await page.route('**/api/settings', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { flyKm: 2000 } }) : r.fallback()));
});

async function open(page: Page, request: Parameters<Parameters<typeof test>[2]>[0]['request']) {
  const trip = await (await request.post('/api/trips', { data: { title: 'Inspector flow', data: { ...EMPTY, stops: SEED } } })).json();
  await page.goto(`/trip/${trip.id}?ui=next&e2e`);
  const leg = async (i: number) => (await (await request.get(`/api/trips/${trip.id}`)).json()).data.stops[i + 1].leg;
  const select = async (i: number) => {
    await page.getByTestId('segment-row').nth(i).click();
    await expect(page.getByTestId('segment-inspector')).toBeVisible();
  };
  return { leg, select, done: () => request.delete(`/api/trips/${trip.id}`) };
}

test.describe('segment inspector @map', () => {
  test('F5: changing mode sets the default figure and shows the air note', async ({ page, request }) => {
    const t = await open(page, request);
    await t.select(1);
    await expect(page.getByTestId('segment-inspector')).toContainText('Berlin → Rome');
    await expect(page.getByTestId('segment-inspector').getByRole('slider', { name: 'Сглаживание' })).toBeVisible();
    await page.getByRole('radio', { name: 'Воздух' }).check({ force: true });
    await expect(page.getByText('Воздушные участки летят по плавной дуге, сглаживание им не нужно.')).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Сглаживание' })).toHaveCount(0);
    await expect.poll(() => t.leg(1)).toMatchObject({ mode: 'air', figure: 'airplane' });
    await t.done();
  });

  test('F5: a picked figure, pace and smoothing persist', async ({ page, request }) => {
    const t = await open(page, request);
    await t.select(1);
    await page.getByTestId('segment-inspector').getByRole('button', { name: /Мотоцикл/ }).click();
    await page.getByRole('slider', { name: 'Темп' }).press('ArrowRight');
    await page.getByRole('slider', { name: 'Сглаживание' }).press('ArrowRight');
    await expect.poll(() => t.leg(1)).toMatchObject({ mode: 'ground', figure: 'motorcycle', speed: 1.25, smooth: 1.5 });
    await page.reload();
    await page.getByTestId('segment-row').nth(1).click();
    await expect(page.getByRole('slider', { name: 'Темп' })).toHaveValue('1.25');
    await expect(page.getByRole('slider', { name: 'Сглаживание' })).toHaveValue('1.5');
    await t.done();
  });

  test('a picked line colour persists; the editor and the player paint use it', async ({ page, request }) => {
    const t = await open(page, request);
    const colors = () => page.evaluate(async () => {
      const { map } = (window as unknown as { __ta: { map: { probe(): Promise<{ colors: Record<string, string[]> }> } } }).__ta;
      return (await map.probe()).colors;
    });
    await t.select(1);
    await page.getByRole('radiogroup', { name: 'Цвет линии' }).getByRole('radio', { name: 'Зелёный' }).check({ force: true });
    await expect.poll(() => t.leg(1)).toMatchObject({ mode: 'ground', color: '#1aae39' });
    await expect.poll(async () => (await colors())['editor-route']).toContain('#1aae39');
    await expect.poll(async () => (await colors()).route).toEqual(['#1aae39']);
    await page.reload();
    await page.getByTestId('segment-row').nth(1).click();
    await expect(page.getByRole('radio', { name: 'Зелёный' })).toBeChecked();
    await t.done();
  });

  test('close deselects the segment', async ({ page, request }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1100, 'the x button is desktop only');
    const t = await open(page, request);
    await t.select(0);
    await page.getByRole('button', { name: 'Снять выделение' }).press('Enter');
    await expect(page.getByTestId('segment-inspector')).toHaveCount(0);
    await t.done();
  });
});
