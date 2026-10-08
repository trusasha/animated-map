import { useState } from 'react';
import type { CustomModel, Mode, ModelPose } from '../../../domain/types';

const NO_POSE: ModelPose = { rx: 0, ry: 0, rz: 0, scale: 1 };
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

export function useEditFigure(model: CustomModel, save: (m: CustomModel) => Promise<CustomModel>, onDone: () => void) {
  const [name, setName] = useState(model.name);
  const [mode, setMode] = useState<Mode | null>(model.mode);
  const [pose, setPose] = useState<ModelPose>(model.pose ?? NO_POSE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rotate = (axis: 'rx' | 'ry' | 'rz', deg: number) => setPose((p) => ({ ...p, [axis]: wrap(p[axis] + deg) }));
  const setScale = (scale: number) => setPose((p) => ({ ...p, scale: Math.round(scale * 10) / 10 }));

  const submit = () => {
    setBusy(true);
    setError('');
    save({ ...model, name: name.trim(), mode, pose }).then(onDone).catch((e) => { setError(e instanceof Error ? e.message : String(e)); setBusy(false); });
  };

  return { name, setName, mode, setMode, pose, rotate, setScale, reset: () => setPose(NO_POSE), busy, error, submit, canSubmit: !!name.trim() && !busy };
}
