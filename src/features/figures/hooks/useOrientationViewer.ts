import { useCallback, useEffect, useRef } from 'react';
import type { Vec3 } from '../../../domain/orientation';
import type { ModelPose } from '../../../domain/types';
import { mountOrientationViewer, type OrientationViewer } from '../../../services/scene3d';

const token = (el: HTMLElement, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

/** ref callback for the orientation stage; follows `pose` without remounting and reports drags through `onRotate` */
export function useOrientationViewer(url: string, pose: ModelPose, onRotate: (axis: Vec3, deg: number) => void) {
  const viewer = useRef<OrientationViewer>(undefined);
  const latest = useRef({ pose, onRotate });

  const stageRef = useCallback((el: HTMLDivElement | null) => {
    viewer.current?.dispose();
    viewer.current = el
      ? mountOrientationViewer(el, url, latest.current.pose, {
        colors: { travel: token(el, '--accent'), grid: token(el, '--text-secondary') },
        onRotate: (axis, deg) => latest.current.onRotate(axis, deg),
      })
      : undefined;
  }, [url]);

  useEffect(() => {
    latest.current = { pose, onRotate };
    viewer.current?.setPose(pose);
  }, [pose, onRotate]);

  return stageRef;
}
