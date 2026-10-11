import * as maplibregl from 'maplibre-gl';
import type { LngLat } from '../../domain/types';
import type { EditorStop } from './types';
import { groupNear, rangeLabel } from './clusters';
import './markers.css';

/** markers closer than this merge into one "7–8" pill */
const OVERLAP_PX = 26;

function element(s: EditorStop) {
  const el = document.createElement('div');
  el.className = ['ta-marker', s.end && 'ta-marker--end', s.active && 'ta-marker--active', s.approx && 'ta-marker--approx',
    !s.inRange && 'ta-marker--out', s.draggable && 'ta-marker--drag'].filter(Boolean).join(' ');
  el.textContent = s.label;
  el.title = s.title;
  return el;
}

function groupElement(group: EditorStop[]) {
  const el = document.createElement('div');
  el.className = ['ta-marker', 'ta-marker--group', group.some((s) => s.end) && 'ta-marker--end', group.some((s) => s.active) && 'ta-marker--active',
    group.every((s) => !s.inRange) && 'ta-marker--out'].filter(Boolean).join(' ');
  el.textContent = rangeLabel(group.map((s) => Number(s.label)));
  el.title = group.map((s) => `${s.label}. ${s.title}`).join('\n');
  return el;
}

const centre = (pts: LngLat[]): LngLat => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

/** numbered DOM markers of the editor; overlapping ones merge into a range pill that splits again on zoom in */
export function createMarkers(map: maplibregl.Map, onDrag: (i: number, p: LngLat) => void, onGroup: (points: LngLat[]) => void) {
  let stops: EditorStop[] = [];
  let markers: maplibregl.Marker[] = [];
  let groups: maplibregl.Marker[] = [];
  let grouped = new Set<number>();
  let key = '';
  let groupKey = '';
  let shown = true;
  let frame = 0;
  const display = (m: maplibregl.Marker, i: number) => { m.getElement().style.display = shown && !grouped.has(i) ? '' : 'none'; };
  const clearGroups = () => { for (const m of groups) m.remove(); groups = []; grouped = new Set(); groupKey = ''; };
  const clear = () => { for (const m of markers) m.remove(); markers = []; stops = []; key = ''; clearGroups(); };

  const regroup = () => {
    frame = 0;
    const found = shown ? groupNear(stops.map((s) => map.project(s.lngLat)), OVERLAP_PX, stops.map((s) => s.draggable)).filter((g) => g.length > 1) : [];
    const k = JSON.stringify(found);
    if (k !== groupKey) {
      clearGroups();
      groupKey = k;
      groups = found.map((g) => {
        const pts = g.map((i) => stops[i].lngLat);
        const el = groupElement(g.map((i) => stops[i]));
        el.addEventListener('click', (e) => { e.stopPropagation(); onGroup(pts); });
        return new maplibregl.Marker({ element: el }).setLngLat(centre(pts)).addTo(map);
      });
      grouped = new Set(found.flat());
    }
    markers.forEach(display);
  };
  const schedule = () => { frame ||= requestAnimationFrame(regroup); };
  map.on('move', schedule);
  map.on('resize', schedule);

  return {
    set(next: EditorStop[]) {
      const k = JSON.stringify(next);
      if (k === key) return;
      clear();
      key = k;
      stops = next;
      markers = next.map((s, i) => {
        const m = new maplibregl.Marker({ element: element(s), draggable: s.draggable }).setLngLat(s.lngLat).addTo(map);
        if (s.draggable) m.on('dragend', () => { const p = m.getLngLat(); onDrag(i, [p.lng, p.lat]); });
        return m;
      });
      regroup();
    },
    show(on: boolean) {
      shown = on;
      regroup();
    },
    clear,
    get visible() { return shown ? markers.length : 0; },
  };
}
