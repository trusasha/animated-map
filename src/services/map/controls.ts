import * as maplibregl from 'maplibre-gl';
import type { ControlsInset } from './types';
import './controls.css';

/** navigation + compact attribution in the bottom-right corner, lifted clear of the UI that covers it */
export function installControls(map: maplibregl.Map, container: HTMLElement) {
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  // compact attribution opens itself on first render and then covers the panels' tap targets on phones
  map.once('load', () => container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
  const corner = container.querySelector<HTMLElement>('.maplibregl-ctrl-bottom-right');
  return (inset: ControlsInset) => {
    if (!corner) return;
    corner.style.bottom = `${Math.max(0, inset.bottom)}px`;
    corner.style.right = `${Math.max(0, inset.right)}px`;
  };
}
