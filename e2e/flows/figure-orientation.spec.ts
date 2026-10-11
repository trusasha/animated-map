import { expect, test } from '@playwright/test';
import { stubNet } from '../fixtures/net';
import { card, CORS, openFigures, ready, stubServer } from './helpers/figures';

test.beforeEach(async ({ page }) => {
  await stubNet(page);
  await page.route('**/api/log', (route) => route.fulfill({ json: {}, headers: CORS }));
});

test.describe('figure orientation', () => {
  test('orientation editor: drag, ±90° buttons and typed angles edit one pose that saves and reopens', async ({ page, request }) => {
    const server = await stubServer(page, [{ ...ready('m1', 'Truck'), pose: { rx: 0, ry: 0, rz: 0, scale: 1.5 } }]);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const dialog = await openFigures(page, request);
    await card(dialog, 'Truck').getByRole('button', { name: 'Truck' }).click();
    await dialog.getByRole('button', { name: 'Orientation' }).click();
    await expect(dialog.getByRole('heading', { name: 'Orientation' })).toBeVisible();
    const field = (name: string) => dialog.getByRole('textbox', { name, exact: true });
    const save = dialog.getByRole('button', { name: 'Save' });
    await expect(save).toBeDisabled();

    const canvas = dialog.getByTestId('orientation-viewer').locator('canvas');
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(field('Turn (Y)')).not.toHaveValue('0');
    await expect(save).toBeEnabled();

    await dialog.getByRole('button', { name: 'Reset' }).click();
    for (const name of ['Tilt (X)', 'Turn (Y)', 'Roll (Z)']) await expect(field(name)).toHaveValue('0');
    await dialog.getByRole('button', { name: 'Turn (Y) +90°' }).click();
    await expect(field('Turn (Y)')).toHaveValue('90');
    await field('Tilt (X)').fill('30');
    await field('Tilt (X)').press('Enter');
    await expect(field('Tilt (X)')).toHaveValue('30');
    await expect(field('Turn (Y)')).toHaveValue('90');

    await save.click();
    await expect(dialog.getByRole('heading', { name: 'Edit figure' })).toBeVisible();
    const put = server.requests('PUT').find((r) => r.url === '/api/models/m1')!.body as { pose: unknown };
    expect(put.pose).toEqual({ rx: 30, ry: 90, rz: 0, scale: 1.5 });

    await dialog.getByRole('button', { name: 'Orientation' }).click();
    await expect(field('Tilt (X)')).toHaveValue('30');
    await expect(field('Turn (Y)')).toHaveValue('90');
    await expect(field('Roll (Z)')).toHaveValue('0');
    await dialog.getByRole('button', { name: '← Back' }).click();
    await expect(dialog.getByRole('heading', { name: 'Edit figure' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
