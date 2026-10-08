import { Placeholder } from '../../../lib/Placeholder';
import type { ExportDialogProps } from '../types';

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  return open ? <Placeholder name="export-dialog"><button onClick={onClose}>close</button></Placeholder> : null;
}
