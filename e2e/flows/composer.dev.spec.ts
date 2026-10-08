import { expect, test, type Page } from '@playwright/test';

const PLAN = {
  title: 'Berlin to Şile',
  stops: [
    { name: 'Berlin', lng: 13.4, lat: 52.5 },
    { name: 'Istanbul', lng: 28.97, lat: 41.01 },
    { name: 'Şile', lng: 29.6, lat: 41.17, approx: true },
  ],
};

const trip = async (page: Page) => JSON.parse((await page.getByTestId('trip').textContent())!);

async function open(page: Page, query: string, { openai = true, parse }: { openai?: boolean; parse?: object | number } = {}) {
  await page.route('**/api/config', (r) => r.fulfill({ json: { openai, photo3d: false } }));
  const logged: { type: string; data: Record<string, unknown> }[] = [];
  await page.route('**/api/log', async (r) => { logged.push(r.request().postDataJSON()); await r.fulfill({ json: {} }); });
  if (parse !== undefined) {
    await page.route('**/api/parse', (r) => (typeof parse === 'number' ? r.fulfill({ status: parse, json: { error: 'no route' } }) : r.fulfill({ json: parse })));
  }
  await page.goto(`/composer-harness.html?${query}`);
  return logged;
}

const build = async (page: Page, text = 'Berlin, Istanbul, Şile') => {
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Build route' }).click();
};

test.describe('composer', () => {
  test('a default-named trip is renamed by the parsed title', async ({ page }) => {
    const logged = await open(page, 'title=My%20trip&stops=0', { parse: PLAN });
    await expect(page.getByText('Type it or say it.')).toBeVisible();
    await build(page);
    await expect(page.getByText('Route replaced with 3 stops.')).toBeVisible();
    const t = await trip(page);
    expect(t.title).toBe('Berlin to Şile');
    expect(t.stops).toHaveLength(3);
    expect(t.stops.map((s: { leg?: unknown }) => !!s.leg)).toEqual([false, true, true]);
    expect(new Set(t.stops.map((s: { id: string }) => s.id)).size).toBe(3);
    await expect.poll(() => logged.some((l) => l.type === 'composer.parse' && l.data.ok === true)).toBe(true);
  });

  test('a custom-named trip keeps its name; approx survives; range resets with a note', async ({ page }) => {
    await open(page, 'title=Summer%20in%20Crimea&stops=3&range=1', { parse: PLAN });
    await expect(page.getByText('This replaces the current route.')).toBeVisible();
    await build(page);
    await expect(page.getByText('Video range reset to the whole route.')).toBeVisible();
    const t = await trip(page);
    expect(t.title).toBe('Summer in Crimea');
    expect(t.range).toBeNull();
    expect(t.stops.map((s: { name: string; approx?: boolean }) => [s.name, !!s.approx])).toEqual([['Berlin', false], ['Istanbul', false], ['Şile', true]]);
  });

  test('a failed parse shows an error toast and keeps the route and the text', async ({ page }) => {
    await open(page, 'title=Mine&stops=2', { parse: 500 });
    await build(page, 'gibberish');
    await expect(page.getByText('Couldn’t find a route in that.')).toBeVisible();
    expect((await trip(page)).stops).toHaveLength(2);
    await expect(page.getByRole('textbox')).toHaveValue('gibberish');
  });

  test('without an OpenAI key the notice shows and every control is disabled', async ({ page }) => {
    await open(page, 'stops=0', { openai: false });
    await expect(page.getByText('This turns on with an OpenAI key.')).toBeVisible();
    await expect(page.getByRole('textbox')).toBeDisabled();
    await expect(page.getByRole('button', { name: '● Speak' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Build route' })).toBeDisabled();
  });
});
