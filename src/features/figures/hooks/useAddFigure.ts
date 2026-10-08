import { useEffect, useMemo, useState } from 'react';
import type { CustomModel, Mode } from '../../../domain/types';

const isGlb = (f: File) => /\.glb$/i.test(f.name);
const isHeic = (f: File) => /\.hei[cf]$/i.test(f.name);

export function useAddFigure(add: (file: File, name: string, mode: Mode | null) => Promise<CustomModel>, onDone: () => void) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = useMemo(() => (file && !isGlb(file) && !isHeic(file) ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setError('');
    if (!name) setName(f.name.replace(/\.\w+$/, ''));
  };

  const submit = () => {
    if (!file) return;
    setBusy(true);
    setError('');
    add(file, name.trim(), mode).then(onDone).catch((e) => { setError(e instanceof Error ? e.message : String(e)); setBusy(false); });
  };

  const kind: 'none' | 'glb' | 'heic' | 'photo' = !file ? 'none' : isGlb(file) ? 'glb' : isHeic(file) ? 'heic' : 'photo';
  return { file, kind, name, setName, mode, setMode, busy, error, preview, pick, submit, canSubmit: !!file && !!name.trim() && !busy };
}
