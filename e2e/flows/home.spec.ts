import { expect, test } from '@playwright/test';
import { emptyTrips } from '../fixtures/api';
import { prepare } from './helpers';

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test.describe('home @map', () => {
  test('F1: no trips shows the empty copy, New trip opens a new trip', async ({ page }) => {
    await emptyTrips(page);
    await page.goto('/?e2e');
    await expect(page.getByText('Путешествий пока нет. Они сохраняются здесь автоматически.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Превратите путешествие в видео.');
    const created = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/trips'));
    await page.getByRole('button', { name: 'Новое путешествие' }).click();
    expect((await created).postDataJSON().title).toBe('Новое путешествие');
    await expect(page).toHaveURL(/\/trip\/[^/?]+\?e2e$/);
    await expect(page.getByRole('textbox', { name: 'Название путешествия' })).toHaveValue('Новое путешествие');
  });

  test('a saved trip shows its stops, modes and opens on click', async ({ page, request }) => {
    const data = {
      stops: [
        { id: 'a', name: 'Paris', lng: 2.35, lat: 48.85 },
        { id: 'b', name: 'Berlin', lng: 13.4, lat: 52.5, leg: { mode: 'air', figure: 'airplane' } },
      ],
      style: 'satellite', speed: 1, format: '9:16',
    };
    const trip = await (await request.post('/api/trips', { data: { title: 'Home row trip', data } })).json();
    await page.goto('/?e2e');
    const row = page.getByTestId('trip-row').filter({ hasText: 'Home row trip' });
    await expect(row).toContainText('2 точки');
    await expect(row).toContainText('Воздух');
    await row.getByRole('button').first().click();
    await expect(page).toHaveURL(new RegExp(`/trip/${trip.id}\\?`));
    await request.delete(`/api/trips/${trip.id}`);
  });
});
