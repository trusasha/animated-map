import type { ReactNode } from 'react';
import type { ControlsInset, Padding } from '../../services/map';

/** layout only: the composition root fills the slots */
export interface EditorShellProps {
  routePanel: ReactNode;
  videoPanel: ReactNode;
  /** null = no segment selected */
  inspector: ReactNode;
  /** non-null = previewing: panels hide, the transport shows */
  transport: ReactNode;
  /** phone only: sticky row under the sheet content (save status, Preview, Export) */
  footer: ReactNode;
  /** a stop is being placed on the map: the phone sheet gets out of the way */
  picking: boolean;
  /** camera padding that keeps the route clear of the panels */
  onPaddingChange: (padding: Padding) => void;
  /** keeps the bottom-right map controls clear of the panels */
  onControlsInsetChange: (inset: ControlsInset) => void;
}
