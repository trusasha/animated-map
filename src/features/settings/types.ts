import type { CustomModel } from '../../domain/types';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** ready custom figures offered next to the built-ins */
  models?: CustomModel[];
}
