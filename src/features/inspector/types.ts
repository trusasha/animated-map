export interface SegmentInspectorProps {
  /** selected segment (leg) index */
  index: number;
  /** deselects: "x" on desktop, "<- All stops" on tablet and phone */
  onClose: () => void;
  /** opens the figures dialog ("+ Your own", "Manage your figures") */
  onManageFigures: () => void;
}
