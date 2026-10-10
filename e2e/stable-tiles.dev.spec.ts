/* eslint-disable @typescript-eslint/no-explicit-any -- page code reaches into untyped app internals */
import { expect, test } from '@playwright/test';
import { boot, THREE_LEGS } from './baselines/capture';

test.setTimeout(240_000);

/** stable tiles patch MapLibre internals; a MapLibre upgrade that moves them must fail here, not degrade exports silently */
test('stable tiles: the export map pins tile levels, so its plan differs from the live one', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(async ({ stops, legs, speed }) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { createOffscreenMap } = await load('/src/services/map/createOffscreenMap.ts');
    const { createOverlay3D } = await load('/src/services/scene3d/index.ts');
    const { planTiles } = await load('/src/services/map/preload/plan.ts');
    const { cursor } = await load('/src/services/map/stable/cursor.ts');
    const plan = async (stableTiles: boolean) => {
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:0;top:0;width:960px;height:540px;z-index:-1';
      document.body.append(host);
      const map = await createOffscreenMap(host, { style: 'satellite', pixelRatio: 1, stableTiles }, createOverlay3D());
      try {
        const player = map.player as any;
        await player.setTrip(stops, legs, speed);
        player.map.jumpTo({ center: legs[0].path[0], zoom: 12, pitch: 55, bearing: 0 });
        const sat = player.map.getSource('sat');
        const levels = new Set(player.map.coveringTiles({ tileSize: 256, roundZoom: true, maxzoom: 19, terrain: player.map.terrain, calculateTileZoom: sat.calculateTileZoom }).map((t: any) => t.canonical.z)).size;
        const planned = await planTiles(player.map, player.lod, player.tl, () => true, () => {});
        const ground = player.tl.legs.find((l: any) => l.mode === 'ground');
        player.setFrame((ground.start + ground.end) / 2);
        const groundLevels = new Set(player.map.coveringTiles({ tileSize: 256, roundZoom: true, maxzoom: 19, terrain: player.map.terrain, calculateTileZoom: sat.calculateTileZoom }).map((t: any) => t.canonical.z)).size;
        return { groundLevels, pitch: player.map.getPitch(), urls: planned.urls as string[], pinned: Object.keys(player.lod.pins ?? {}).length, hits: cursor.hits, levels };
      } finally {
        map.destroy();
        host.remove();
      }
    };
    const live = await plan(false), stable = await plan(true);
    return { live: live.urls.length, stable: stable.urls.length, pinned: stable.pinned, hits: stable.hits, levels: { live: live.levels, stable: stable.levels }, ground: { live: live.groundLevels, stable: stable.groundLevels, pitch: stable.pitch }, same: live.urls.join() === stable.urls.join() };
  }, { stops: THREE_LEGS.stops, legs: THREE_LEGS.legs, speed: THREE_LEGS.speed });
  expect(result.pinned, 'every tiled source has pins').toBeGreaterThan(0);
  expect(result.hits, 'the zoom function knew its tile, so the pins applied').toBeGreaterThan(0);
  expect(result.levels.live, 'a pitched live view loads coarser tiles far away').toBeGreaterThan(1);
  expect(result.levels.stable, 'a pitched stable view loads one level, near and far').toBe(1);
  expect(result.ground.pitch, 'the ground frame is pitched').toBeGreaterThan(40);
  expect(result.ground.live, 'live mixes levels in that frame').toBeGreaterThan(1);
  expect(result.ground.stable, 'strict stable loads one level in a pitched ground frame').toBe(1);
  expect(result.stable, 'the stable plan has tiles').toBeGreaterThan(0);
  expect(result.same, `stable (${result.stable} tiles) and live (${result.live}) plans must differ`).toBe(false);
});
