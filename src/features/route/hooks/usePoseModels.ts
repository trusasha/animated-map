import { useEffect, useState } from 'react';
import { poseKey } from '../../../domain/figures';
import type { CustomModel } from '../../../domain/types';
import { api } from '../../../services/api';
import { setModelPoses } from '../../../services/scene3d';

/** custom figures with their poses applied to the 3D engine; `poseKey` is null until they have loaded */
export function usePoseModels() {
  const [models, setModels] = useState<CustomModel[] | null>(null);
  useEffect(() => {
    let alive = true;
    api.models().catch(() => [] as CustomModel[]).then((list) => {
      if (!alive) return;
      setModelPoses(list);
      setModels(list);
    });
    return () => { alive = false; };
  }, []);
  return { models: models ?? [], poseKey: models ? poseKey(models) : null };
}
