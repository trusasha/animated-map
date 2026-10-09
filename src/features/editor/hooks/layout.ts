import type { ViewportMode } from '../../../ds';
import type { ControlsInset, Padding } from '../../../services/map';

/** floating cards: margin to the map edge, route column and desktop inspector widths (A§2.3) */
export const EDGE = 16;
export const COLUMN = 356;
export const INSPECTOR = 336;

export interface ChromeState {
  mode: ViewportMode;
  inspector: boolean;
  previewing: boolean;
  /** phone sheet height, px */
  sheet: number;
}

const ZERO: Padding = { top: 0, bottom: 0, left: 0, right: 0 };
const column = EDGE + COLUMN;
const rightCard = (s: ChromeState) => (s.mode === 'desktop' && s.inspector ? EDGE + INSPECTOR : 0);

/** camera padding that keeps the route clear of the visible panels and the bottom-right controls */
export function paddingFor(s: ChromeState): Padding {
  if (s.previewing) return ZERO;
  if (s.mode === 'desktop') return { top: 60, bottom: 60, left: column + 18, right: s.inspector ? rightCard(s) + 48 : 60 };
  if (s.mode === 'tablet') return { top: 50, bottom: 50, left: column + 8, right: 60 };
  return { top: 40, bottom: s.sheet + EDGE, left: 32, right: 56 };
}

/** phone: top-right, clear of the sheet; elsewhere bottom-right, left of the desktop inspector */
export function controlsFor(s: ChromeState): ControlsInset {
  if (s.mode === 'phone') return { top: 0, bottom: 0, right: 0 };
  return { bottom: 0, right: s.previewing ? 0 : rightCard(s) };
}

/** map width the panels leave uncovered on each side, px; the phone sheet covers the bottom instead */
export function freeArea(s: ChromeState): { left: number; right: number } {
  if (s.mode === 'phone' || s.previewing) return { left: 0, right: 0 };
  return { left: column, right: rightCard(s) };
}

/** horizontal centre of the free map area, for the pick banner */
export function overlayCenter(s: ChromeState): string {
  if (s.mode === 'phone' || s.previewing) return '50%';
  return `calc(50% + ${(column - rightCard(s)) / 2}px)`;
}
