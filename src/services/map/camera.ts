import * as maplibregl from 'maplibre-gl';
import type { LngLat } from '../../domain/types';
import type { CameraView, FitOptions, Padding } from './types';

const ZERO: Padding = { top: 0, bottom: 0, left: 0, right: 0 };
const PADDING_MS = 300;
// maplibre merges options over its defaults, so an explicit `curve: undefined` turns the flight into NaN
const curveOf = (curve?: number) => (curve === undefined ? {} : { curve });

/** resolves on moveend, or a little after the planned duration if none comes; a hidden tab jumps */
function settle(map: maplibregl.Map, duration: number, run: (animate: boolean) => void) {
  return new Promise<void>((resolve) => {
    run(!document.hidden);
    if (!map.isMoving()) { resolve(); return; }
    const done = () => { clearTimeout(timer); map.off('moveend', done); resolve(); };
    const timer = setTimeout(done, duration + 600);
    map.once('moveend', done);
  });
}

/**
 * UI padding and camera moves of the interactive map. While suspended (playback) the padding is
 * held at zero and moves are ignored: the timeline camera frames the bare container, like the export.
 */
export function createCamera(map: maplibregl.Map) {
  let padding = ZERO;
  let suspended = false;
  const view = (v: CameraView) => {
    if (v.padding) padding = { ...v.padding };
    return { center: v.center, zoom: v.zoom, bearing: v.bearing ?? 0, pitch: v.pitch ?? 0, padding };
  };

  return {
    setPadding(p: Padding) {
      padding = { ...p };
      if (!suspended && !map.isMoving()) map.easeTo({ padding, duration: PADDING_MS });
    },
    resetPadding() { this.setPadding(ZERO); },
    getPadding(): Padding {
      const { top = 0, bottom = 0, left = 0, right = 0 } = map.getPadding();
      return { top, bottom, left, right };
    },

    fitTo(points: LngLat[], o: FitOptions) {
      if (suspended || !points.length) return Promise.resolve();
      if (points.length === 1) {
        return settle(map, o.duration, (animate) =>
          map.easeTo({ center: points[0], zoom: o.singleZoom ?? o.maxZoom, padding, duration: o.duration, animate }));
      }
      const b = new maplibregl.LngLatBounds();
      for (const p of points) b.extend(p);
      return settle(map, o.duration, (animate) => map.fitBounds(b, {
        padding, absolutePadding: true, maxZoom: o.maxZoom, pitch: 0, bearing: 0, duration: o.duration, ...curveOf(o.curve), animate,
      }));
    },
    flyTo(v: CameraView, o: { duration: number; curve?: number }) {
      const target = view(v);
      if (suspended) return Promise.resolve();
      return settle(map, o.duration, (animate) => map.flyTo({ ...target, duration: o.duration, ...curveOf(o.curve), essential: true, animate }));
    },
    jumpTo(v: CameraView) {
      const target = view(v);
      if (!suspended) map.jumpTo(target);
    },

    /** playback on: zero padding; off: the UI padding comes back */
    suspend(on: boolean) {
      if (on === suspended) return;
      suspended = on;
      map.stop();
      map.setPadding(on ? ZERO : padding);
    },
  };
}
