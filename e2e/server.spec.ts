import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { DEFAULT_SETTINGS } from '../src/domain/settings';
import type { TripData } from '../src/domain/types';
import { heicToJpeg } from '../server/files';

test.describe.configure({ mode: 'serial' });

const trip30: TripData = {
  style: 'satellite', speed: 1, format: '16:9',
  stops: Array.from({ length: 30 }, (_, i) => ({
    id: `stop-${i}-${'x'.repeat(24)}`, name: `Place ${i}`, lng: 10 + i * 0.123456, lat: 40 + i * 0.234567,
    leg: i ? { mode: i % 2 ? 'ground' : 'air', figure: 'car', pathKey: `a>b:${i}`, path: Array.from({ length: 500 }, (_, k) => [k * 0.001, k * 0.002] as [number, number]) } : undefined,
  })),
};

test('settings: defaults, validated PUT, persisted', async ({ request }) => {
  expect(await (await request.get('/api/settings')).json()).toEqual(DEFAULT_SETTINGS);
  const put = await request.put('/api/settings', { data: { theme: 'dark', flyKm: 99999, junk: 1 } });
  expect(await put.json()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', flyKm: 2000 });
  expect((await (await request.get('/api/settings')).json()).theme).toBe('dark');
  await request.put('/api/settings', { data: {} });
});

test('trips: list is lightweight, get returns full data', async ({ request }) => {
  const created = await (await request.post('/api/trips', { data: { title: 'Server spec', data: trip30 } })).json();
  const list = await (await request.get('/api/trips')).json();
  const item = list.find((t: { id: string }) => t.id === created.id);
  expect(Object.keys(item).sort()).toEqual(['id', 'points', 'summary', 'title', 'updated_at']);
  expect(item.summary).toEqual({ stops: 30, modes: ['ground', 'air'] });
  expect(item.points).toHaveLength(30);
  expect(JSON.stringify(item).length).toBeLessThan(2048);
  const full = await (await request.get(`/api/trips/${created.id}`)).json();
  expect(full.data.stops[1].leg.path).toHaveLength(500);
  await request.delete(`/api/trips/${created.id}`);
  expect((await request.get(`/api/trips/${created.id}`)).status()).toBe(404);
});

test('models, config and log routes', async ({ request }, info) => {
  expect(Array.isArray(await (await request.get('/api/models')).json())).toBe(true);
  expect(await (await request.get('/api/config')).json()).toHaveProperty('photo3d');
  const type = `server-spec-${Date.now()}`;
  await request.post('/api/log', { data: { type, data: { ok: 1 } } });
  expect(readFileSync(`.e2e-data-${new URL(info.project.use.baseURL!).port}/logs/actions.jsonl`, 'utf8')).toContain(type);
});

test('health: liveness with a db ping, stats count logged events', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, db: { ok: true } });
  await request.post('/api/log', { data: { type: 'export.start', data: { trip: 'x' }, session: 's1' } });
  await request.post('/api/log', { data: { type: 'export.crashed', data: { trip: 'x', progress: 0.4 }, session: 's2' } });
  await expect.poll(async () => (await (await request.get('/api/health/stats?hours=1')).json()).export.crashed).toBeGreaterThan(0);
  const stats = await (await request.get('/api/health/stats?hours=1')).json();
  expect(stats.export.started).toBeGreaterThan(0);
  expect(stats.recentProblems.some((p: { type: string; data: { progress?: number } }) => p.type === 'export.crashed' && p.data.progress === 0.4)).toBe(true);
});

test('HEIC converts to JPEG', async () => {
  try { execFileSync('sips', ['--version'], { stdio: 'ignore' }); } catch {
    test.skip(true, 'macOS sips is not available: HEIC conversion is macOS-only by design');
  }
  const dir = mkdtempSync(`${tmpdir()}/heic-`);
  try {
    execFileSync('sips', ['-s', 'format', 'heic', 'e2e/fixtures/tiles/satellite.png', '--out', `${dir}/a.heic`], { stdio: 'ignore' });
    const jpeg = heicToJpeg(readFileSync(`${dir}/a.heic`));
    expect([...jpeg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
