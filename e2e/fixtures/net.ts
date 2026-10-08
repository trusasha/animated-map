import { readFileSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';

const tile = (name: string) => readFileSync(new URL(`./tiles/${name}`, import.meta.url));
const SATELLITE = tile('satellite.png');
const DEM_FLAT = tile('terrarium-flat.png');
const STYLE = tile('style.json');
const EMPTY = Buffer.alloc(0);
const CORS = { 'access-control-allow-origin': '*' };

const PLACES = {
  paris: { name: 'Paris', label: 'Paris, France', lng: 2.3522, lat: 48.8566 },
  berlin: { name: 'Berlin', label: 'Berlin, Germany', lng: 13.405, lat: 52.52 },
  rome: { name: 'Rome', label: 'Rome, Italy', lng: 12.4964, lat: 41.9028 },
};

const delays = new WeakMap<Page, number>();

/** every stubbed tile response waits this long first; 0 restores instant tiles */
export const slowTiles = (page: Page, ms: number) => void delays.set(page, ms);

const json = (route: Route, body: unknown) => route.fulfill({ json: body, headers: CORS });

const tileRoute = (page: Page, body: Buffer, contentType: string) => async (route: Route) => {
  const ms = delays.get(page) ?? 0;
  if (ms) await new Promise((r) => setTimeout(r, ms));
  await route.fulfill({ body, contentType, headers: CORS }).catch(() => {});
};

const placeFor = (q: string) => Object.values(PLACES).filter((p) => p.name.toLowerCase().startsWith(q.toLowerCase()));

export async function stubNet(page: Page) {
  await page.route(/\.arcgisonline\.com\//, tileRoute(page, SATELLITE, 'image/png'));
  await page.route(/elevation-tiles-prod/, tileRoute(page, DEM_FLAT, 'image/png'));
  await page.route(/tiles\.openfreemap\.org\/styles\//, (route) => route.fulfill({ body: STYLE, contentType: 'application/json', headers: CORS }));
  await page.route(/tiles\.openfreemap\.org\/fonts\//, tileRoute(page, EMPTY, 'application/x-protobuf'));
  await page.route(/tiles\.openfreemap\.org\/(?!styles|fonts)/, tileRoute(page, EMPTY, 'application/x-protobuf'));
  await page.route(/router\.project-osrm\.org\/route\/v1\/driving\/([^;]+);([^?]+)/, (route) => {
    const [a, b] = new URL(route.request().url()).pathname.split('/').pop()!.split(';').map((s) => s.split(',').map(Number));
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.01];
    return json(route, { code: 'Ok', routes: [{ geometry: { type: 'LineString', coordinates: [a, mid, b] } }] });
  });
  await page.route('**/api/geocode*', (route) => json(route, placeFor(new URL(route.request().url()).searchParams.get('q') ?? '')));
  await page.route('**/api/reverse*', (route) => json(route, PLACES.paris));
  await page.route('**/api/parse', (route) => json(route, { title: 'Stub trip', stops: [PLACES.paris, PLACES.berlin] }));
  await page.route('**/api/voice', (route) => json(route, { text: 'stub transcript' }));
}
