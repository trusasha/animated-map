import { useEffect, useEffectEvent } from 'react';
import type { ControlsInset, Padding } from '../../../services/map';
import { controlsFor, paddingFor, type ChromeState } from './layout';

/** reports camera padding (settled sheet) and the controls inset (live sheet) as the panels change */
export function useEditorPadding(
  state: ChromeState & { sheetSettled: number },
  onPadding: (p: Padding) => void,
  onControls: (i: ControlsInset) => void,
  onRefit: () => void,
) {
  const emitRefit = useEffectEvent(onRefit);
  const emitPadding = useEffectEvent(onPadding);
  const emitControls = useEffectEvent(onControls);
  const padding = paddingFor({ ...state, sheet: state.sheetSettled });
  const controls = controlsFor(state);
  const p = JSON.stringify(padding), c = JSON.stringify(controls);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value, the objects are rebuilt every render
  useEffect(() => emitPadding(padding), [p]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value, the objects are rebuilt every render
  useEffect(() => emitControls(controls), [c]);
  useEffect(() => () => emitControls({ bottom: 0, right: 0 }), []);
  // after the padding effect above, so the fit uses the new padding
  useEffect(() => { if (state.sheetSettled > 0) emitRefit(); }, [state.sheetSettled]);
}
