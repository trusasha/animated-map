/* eslint-disable @typescript-eslint/no-explicit-any -- page code drives the service through an untyped window handle */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { stubNet } from './fixtures/net';

const TRIP = JSON.parse(readFileSync(new URL('./fixtures/trips/three-legs.json', import.meta.url), 'utf8'));
const PADDING = { top: 60, bottom: 60, left: 390, right: 60 };
const ZERO = { top: 0, bottom: 0, left: 0, right: 0 };
const PLAYER = ['route', 'trail', 'stops', 'stop-labels'];
const EDITOR = ['seg-casing', 'seg-ground', 'seg-water', 'seg-air', 'seg-pending'];

/** a MapService on a bare dev-server page, showing the three-leg trip in editing mode */
async function mount(page: Page) {
  await stubNet(page);
  // a page without the legacy app: its own map would compete for the software GL
  await page.goto('/api/config');
  await page.evaluate(async (trip) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { createMapService } = await load('/src/services/map/index.ts');
    const { createOverlay3D } = await load('/src/services/scene3d/index.ts');
    const host = document.createElement('div');
    host.id = 'map-harness';
    host.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:700px;z-index:100000';
    document.body.append(host);
    const map = createMapService(host, createOverlay3D());
    await map.whenLoaded();
    const events: unknown[] = [];
    map.onSegmentClick((i: number) => events.push(['segment', i]));
    map.onEmptyClick(() => events.push(['empty', null]));
    map.onStopDrag((i: number, p: number[]) => events.push(['drag', i, p]));
    const n = trip.stops.length;
    map.setEditorRoute({
      selected: null,
      segments: trip.legs.map((l: any) => ({ mode: l.mode, path: l.path, color: '#0075de', inRange: true, pending: false })),
      stops: trip.stops.map((s: any, i: number) => ({
        lngLat: [s.lng, s.lat], label: String(i + 1), title: s.name, end: i === 0 || i === n - 1, approx: false, active: false, inRange: true, draggable: i === 2,
      })),
    });
    await map.player.setTrip(trip.stops, trip.legs, trip.speed);
    await map.fitTo(trip.stops.map((s: any) => [s.lng, s.lat]), { maxZoom: 10, duration: 0 });
    (window as any).__h = { map, events };
  }, TRIP);
  await expect.poll(() => probe(page).then((p) => p.features['editor-route'])).toBe(3);
}

const probe = (page: Page) => page.evaluate(() => (window as any).__h.map.probe());
const events = (page: Page) => page.evaluate(() => (window as any).__h.events.splice(0));
const screen = (page: Page, p: number[]) => page.evaluate((q) => (window as any).__h.map.project(q) as [number, number], p);
const visible = (v: Record<string, boolean>, ids: string[]) => ids.map((id) => v[id]);

// one software-GL map at a time
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

test.describe('map service editor @map', () => {
  test.beforeEach(async ({ page }) => mount(page));

  test('hit layer click gives the segment, empty map gives null', async ({ page }) => {
    const ground = TRIP.legs[1].path;
    const [x, y] = await screen(page, ground[Math.floor(ground.length / 2)]);
    // the hit layer becomes queryable once its tiles are placed
    await expect(async () => {
      await page.mouse.click(x, y);
      expect(await events(page)).toEqual([['segment', 1]]);
    }).toPass();
    await page.mouse.click(40, 660);
    expect(await events(page)).toEqual([['empty', null]]);
  });

  test('dragging a marker reports the stop index and where it landed', async ({ page }) => {
    const marker = page.locator('#map-harness .ta-marker').nth(2);
    await expect(marker).toHaveText('3');
    const box = (await marker.boundingBox())!;
    const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 40, cy + 30, { steps: 8 });
    await page.mouse.up();
    const [[kind, index, p]] = await events(page);
    expect([kind, index]).toEqual(['drag', 2]);
    const [lng, lat] = p as number[];
    const naples = TRIP.stops[2];
    expect(lng).toBeGreaterThan(naples.lng);
    expect(lat).toBeLessThan(naples.lat);
  });

  test('a frame hides the editor and zeroes padding, null brings both back', async ({ page }) => {
    await page.evaluate((p) => (window as any).__h.map.setPadding(p), PADDING);
    await expect.poll(() => probe(page).then((p) => p.padding)).toEqual(PADDING);
    let p = await probe(page);
    expect(p.markers).toBe(4);
    expect(visible(p.visible, EDITOR)).toEqual(EDITOR.map(() => true));
    expect(visible(p.visible, PLAYER)).toEqual(PLAYER.map(() => false));

    await page.evaluate(() => (window as any).__h.map.player.setFrame(2));
    p = await probe(page);
    expect(p.padding).toEqual(ZERO);
    expect(p.markers).toBe(0);
    await expect(page.locator('#map-harness .ta-marker').first()).toBeHidden();
    expect(visible(p.visible, EDITOR)).toEqual(EDITOR.map(() => false));
    expect(visible(p.visible, PLAYER)).toEqual(PLAYER.map(() => true));

    await page.evaluate(() => (window as any).__h.map.player.setFrame(null));
    p = await probe(page);
    expect(p.padding).toEqual(PADDING);
    expect(p.markers).toBe(4);
    expect(visible(p.visible, EDITOR)).toEqual(EDITOR.map(() => true));
    expect(visible(p.visible, PLAYER)).toEqual(PLAYER.map(() => false));
  });

  test('Home leaves no route, trail or markers and shows saved trips', async ({ page }) => {
    await page.evaluate(() => { const { player } = (window as any).__h.map; player.setFrame(player.duration - 0.1); });
    await expect.poll(() => probe(page).then((p) => p.features.trail)).toBeGreaterThan(0);
    await page.evaluate((stops) => {
      const map = (window as any).__h.map;
      map.setMode('home');
      map.setHomeTrips([{ id: 'a', points: stops.map((s: any) => [s.lng, s.lat]) }, { id: 'b', points: [[0, 0]] }]);
    }, TRIP.stops);
    await expect.poll(async () => {
      const { features: f } = await probe(page);
      return [f.route, f.trail, f.stops, f['editor-route'], f['home-trips']];
    }).toEqual([0, 0, 0, 0, 1]);
    const p = await probe(page);
    expect(p.markers).toBe(0);
    expect(p.padding).toEqual(ZERO);
    expect(visible(p.visible, ['home-trips', 'home-trip-pts'])).toEqual([true, true]);
    expect(visible(p.visible, [...EDITOR, ...PLAYER]).every((v) => !v)).toBe(true);
  });
});
