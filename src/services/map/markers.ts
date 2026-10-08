import * as maplibregl from 'maplibre-gl';
import type { LngLat } from '../../domain/types';
import type { EditorStop } from './types';
import './markers.css';

function element(s: EditorStop) {
  const el = document.createElement('div');
  el.className = ['ta-marker', s.end && 'ta-marker--end', s.active && 'ta-marker--active', s.approx && 'ta-marker--approx',
    !s.inRange && 'ta-marker--out', s.draggable && 'ta-marker--drag'].filter(Boolean).join(' ');
  el.textContent = s.label;
  el.title = s.title;
  return el;
}

/** numbered DOM markers of the editor; rebuilt only when the stops change */
export function createMarkers(map: maplibregl.Map, onDrag: (i: number, p: LngLat) => void) {
  let markers: maplibregl.Marker[] = [];
  let key = '';
  let shown = true;
  const display = (m: maplibregl.Marker) => { m.getElement().style.display = shown ? '' : 'none'; };
  const clear = () => { for (const m of markers) m.remove(); markers = []; key = ''; };
  return {
    set(stops: EditorStop[]) {
      const k = JSON.stringify(stops);
      if (k === key) return;
      clear();
      key = k;
      markers = stops.map((s, i) => {
        const m = new maplibregl.Marker({ element: element(s), draggable: s.draggable }).setLngLat(s.lngLat).addTo(map);
        if (s.draggable) m.on('dragend', () => { const p = m.getLngLat(); onDrag(i, [p.lng, p.lat]); });
        display(m);
        return m;
      });
    },
    show(on: boolean) {
      shown = on;
      markers.forEach(display);
    },
    clear,
    get visible() { return shown ? markers.length : 0; },
  };
}
