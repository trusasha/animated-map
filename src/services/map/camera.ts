import * as maplibregl from 'maplibre-gl';
import type { LngLat } from '../../domain/types';
import type { CameraView, FitOptions, Padding } from './types';

const ZERO: Padding = { top: 0, bottom: 0, left: 0, right: 0 };
const PADDING_MS = 300;
// fitBounds on the globe lands up to ~20 px past its padding, which put leg ends under the panels
const FIT_MARGIN = 28;
const withMargin = (p: Padding): Padding =>
  ({ top: p.top + FIT_MARGIN, bottom: p.bottom + FIT_MARGIN, left: p.left + FIT_MARGIN, right: p.right + FIT_MARGIN });
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
  let fitting: { points: LngLat[]; o: FitOptions } | null = null;
  const view = (v: CameraView) => {
    if (v.padding) padding = { ...v.padding };
    return { center: v.center, zoom: v.zoom, bearing: v.bearing ?? 0, pitch: v.pitch ?? 0, padding };
  };

  return {
    setPadding(p: Padding) {
      padding = { ...p };
      if (suspended) return;
      // a panel opened by the same click that started the fit reports its padding a tick later: re-aim the fit
      if (fitting && map.isMoving()) void this.fitTo(fitting.points, fitting.o);
      else if (!map.isMoving()) map.easeTo({ padding, duration: PADDING_MS });
    },
    /** like setPadding, but also zooms and supersedes a move in flight, so the last call always lands */
    setPaddingAndZoom(p: Padding, zoom: number) {
      padding = { ...p };
      if (!suspended) map.easeTo({ padding, zoom, duration: document.hidden ? 0 : PADDING_MS });
    },
    resetPadding() { this.setPadding(ZERO); },
    getPadding(): Padding {
      const { top = 0, bottom = 0, left = 0, right = 0 } = map.getPadding();
      return { top, bottom, left, right };
    },

    fitTo(points: LngLat[], o: FitOptions) {
      if (suspended || !points.length) return Promise.resolve();
      const job = { points, o };
      fitting = job;
      const run = (animate: boolean) => {
        if (points.length === 1) {
          map.easeTo({ center: points[0], zoom: o.singleZoom ?? o.maxZoom, padding, duration: o.duration, animate });
          return;
        }
        const b = new maplibregl.LngLatBounds();
        for (const p of points) b.extend(p);
        const fit = { padding: withMargin(padding), maxZoom: o.maxZoom, bearing: 0 };
        const cam = map.cameraForBounds(b, { ...fit, absolutePadding: true });
        if (!cam) return;
        // maplibre's globe fit sizes the zoom to the whole canvas when the padding is absolute; the relative fit gets it right
        const zoom = map.getProjection()?.type === 'globe' ? map.cameraForBounds(b, fit)?.zoom ?? cam.zoom : cam.zoom;
        map.flyTo({ ...cam, zoom, padding, pitch: 0, duration: o.duration, ...curveOf(o.curve), essential: true, animate });
      };
      return settle(map, o.duration, run).then(() => { if (fitting === job) fitting = null; });
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
