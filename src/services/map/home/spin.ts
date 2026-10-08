import type { Map as MlMap } from 'maplibre-gl';

const DEG_PER_FRAME = 0.035;

/** turns the globe eastwards every frame while `active()` holds and nothing else moves the camera; returns stop */
export function startSpin(map: MlMap, active: () => boolean) {
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!active() || map.isMoving()) return;
    const c = map.getCenter();
    map.setCenter([c.lng + DEG_PER_FRAME, c.lat]);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
