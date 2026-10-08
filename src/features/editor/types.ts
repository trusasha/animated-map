import type { ReactNode } from 'react';
import type { Padding } from '../../services/map';

/** layout only: the composition root fills the slots */
export interface EditorShellProps {
  routePanel: ReactNode;
  videoPanel: ReactNode;
  /** null = no segment selected */
  inspector: ReactNode;
  /** non-null = previewing: panels hide, the transport shows */
  transport: ReactNode;
  /** camera padding that keeps the route clear of the panels */
  onPaddingChange: (padding: Padding) => void;
}
