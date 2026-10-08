import { useModels } from '../../figures';

/** custom figures (poses applied to the 3D engine by the store); `poseKey` is null until they have loaded */
export function usePoseModels() {
  const { models, loaded, poseKey } = useModels();
  return { models, poseKey: loaded ? poseKey : null };
}
