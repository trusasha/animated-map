import { useEffect, useEffectEvent } from 'react';
import { useViewportMode, type ViewportMode } from '../../../ds';
import type { Padding } from '../../../services/map';

const PHONE_SHEET_FRACTION = 0.46;

const paddingFor = (mode: ViewportMode, inspector: boolean, previewing: boolean): Padding => {
  if (previewing) return { top: 0, bottom: 0, left: 0, right: 0 };
  if (mode === 'desktop') return { top: 60, bottom: 60, left: 390, right: inspector ? 400 : 60 };
  if (mode === 'tablet') return { top: 50, bottom: 50, left: 380, right: 50 };
  return { top: 40, bottom: Math.round(window.innerHeight * PHONE_SHEET_FRACTION) + 16, left: 32, right: 32 };
};

export function useEditorPadding(inspector: boolean, previewing: boolean, onChange: (p: Padding) => void) {
  const { mode } = useViewportMode();
  const emit = useEffectEvent(onChange);
  useEffect(() => emit(paddingFor(mode, inspector, previewing)), [mode, inspector, previewing]);
}
