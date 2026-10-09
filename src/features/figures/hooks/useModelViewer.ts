import { useCallback, useEffect, useRef } from 'react';
import type { ModelPose } from '../../../domain/types';
import { mountModelViewer, type ModelViewer } from '../../../services/scene3d';

/** ref callback for the viewer stage; follows `pose` changes without remounting */
export function useModelViewer(figureId: string, pose: ModelPose) {
  const viewer = useRef<ModelViewer>(undefined);
  const latest = useRef(pose);
  const key = `${pose.rx},${pose.ry},${pose.rz},${pose.scale}`;

  const stageRef = useCallback((el: HTMLElement | null) => {
    viewer.current?.dispose();
    viewer.current = el ? mountModelViewer(el, figureId, latest.current) : undefined;
  }, [figureId]);

  useEffect(() => {
    if (latest.current === pose) return;
    latest.current = pose;
    viewer.current?.setPose(pose);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pose identity changes every render of the parent; key is its value
  }, [key]);

  return stageRef;
}
