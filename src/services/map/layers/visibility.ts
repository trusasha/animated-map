import type { Map as MlMap } from 'maplibre-gl';
import { HOME_LAYERS } from '../home/tripsLayer';
import type { MapMode } from '../types';
import { EDITOR_LAYERS } from './editorLayers';
import { PLAYER_LAYERS } from './routeLayers';

const show = (map: MlMap, ids: string[], on: boolean) => {
  for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
};

/** editing shows the editor's lines, a frame shows the player's (as the export does), Home only saved trips */
export function applyVisibility(map: MlMap, mode: MapMode, editing: boolean) {
  show(map, PLAYER_LAYERS, mode === 'editor' && !editing);
  show(map, EDITOR_LAYERS, mode === 'editor' && editing);
  show(map, HOME_LAYERS, mode === 'home');
}
