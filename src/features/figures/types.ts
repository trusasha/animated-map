import type { Mode } from '../../domain/types';

export interface FiguresDialogProps { open: boolean; onClose: () => void }

export interface FigurePickerProps {
  mode: Mode;
  /** built-in figure id or `model:<glb url>` */
  value: string;
  onChange: (figure: string) => void;
  /** shows the dashed "+ Your own" tile */
  onAddOwn?: () => void;
}
