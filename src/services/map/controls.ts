import * as maplibregl from 'maplibre-gl';
import type { ControlsInset } from './types';
import './controls.css';

/** navigation + compact attribution on the right, moved clear of the UI that covers it */
export function installControls(map: maplibregl.Map, container: HTMLElement) {
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  // compact attribution opens itself on first render and again on every style change, covering the panels
  const collapse = () => container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  map.on('load', collapse);
  map.on('style.load', () => requestAnimationFrame(collapse));
  const corner = container.querySelector<HTMLElement>('.maplibregl-ctrl-bottom-right');
  return (inset: ControlsInset) => {
    if (!corner) return;
    corner.toggleAttribute('data-top', inset.top !== undefined);
    corner.style.top = inset.top === undefined ? '' : `${Math.max(0, inset.top)}px`;
    corner.style.bottom = inset.top === undefined ? `${Math.max(0, inset.bottom)}px` : 'auto';
    corner.style.right = `${Math.max(0, inset.right)}px`;
  };
}
