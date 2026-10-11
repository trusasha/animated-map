import { useState } from 'react';
import { AXES, resetPoseAngles, rotatePose, setPoseAngle, type AngleKey, type Vec3 } from '../../../domain/orientation';
import type { CustomModel, ModelPose } from '../../../domain/types';

const NO_POSE: ModelPose = { rx: 0, ry: 0, rz: 0, scale: 1 };

/** draft rotation of a custom figure; mouse, typed angles and quarter-turn buttons all edit the same pose */
export function useOrientationEditor(model: CustomModel, save: (m: CustomModel) => Promise<CustomModel>, onDone: () => void) {
  const saved = model.pose ?? NO_POSE;
  const [pose, setPose] = useState<ModelPose>(saved);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const change = (next: (p: ModelPose) => ModelPose) => { setPose(next); setRevision((r) => r + 1); };
  const dirty = pose.rx !== saved.rx || pose.ry !== saved.ry || pose.rz !== saved.rz;

  const submit = () => {
    setBusy(true);
    setError('');
    save({ ...model, pose: { ...pose, scale: saved.scale } }).then(onDone).catch((e) => { setError(e instanceof Error ? e.message : String(e)); setBusy(false); });
  };

  return {
    pose, revision, busy, error, dirty, submit,
    rotate: (axis: Vec3, deg: number) => change((p) => rotatePose(p, axis, deg)),
    turn: (key: AngleKey, deg: number) => change((p) => rotatePose(p, AXES[key], deg)),
    setAngle: (key: AngleKey, text: string) => change((p) => setPoseAngle(p, key, text)),
    reset: () => change(resetPoseAngles),
  };
}
