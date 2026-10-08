import type { Map as MlMap } from 'maplibre-gl';
import { ukiyoePattern } from './ukiyoe';

/** the ukiyoe style references images (paper texture) that are drawn on demand */
export function installImageResolver(map: MlMap) {
  map.setMissingStyleImageResolver((id) => {
    const img = ukiyoePattern(id);
    if (img && !map.hasImage(id)) map.addImage(id, img);
  });
}
