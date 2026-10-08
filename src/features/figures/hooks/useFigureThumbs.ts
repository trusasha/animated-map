import { useEffect, useState } from 'react';
import type { ModelPose } from '../../../domain/types';
import { figureKey, figureThumb } from '../../../services/scene3d';

export interface ThumbRequest { id: string; pose?: ModelPose | null }

const keyOf = ({ id, pose }: ThumbRequest) => figureKey(id, pose ?? undefined);

/** thumbnail data URLs for figures and poses; `thumb()` is undefined until the render finishes */
export function useFigureThumbs(requests: ThumbRequest[]) {
  const [done, setDone] = useState<Record<string, string>>({});
  const wanted = JSON.stringify(requests.map((r) => [r.id, r.pose ?? null]));

  useEffect(() => {
    let live = true;
    for (const [id, pose] of JSON.parse(wanted) as [string, ModelPose | null][]) {
      figureThumb(id, pose ?? undefined)
        .then((src) => live && setDone((d) => (d[keyOf({ id, pose })] === src ? d : { ...d, [keyOf({ id, pose })]: src })))
        .catch(() => {});
    }
    return () => { live = false; };
  }, [wanted]);

  return (request: ThumbRequest) => done[keyOf(request)];
}
