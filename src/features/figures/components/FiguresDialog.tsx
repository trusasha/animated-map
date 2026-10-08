import { Placeholder } from '../../../lib/Placeholder';
import type { FiguresDialogProps } from '../types';

export function FiguresDialog({ open, onClose }: FiguresDialogProps) {
  return open ? <Placeholder name="figures-dialog"><button onClick={onClose}>close</button></Placeholder> : null;
}
