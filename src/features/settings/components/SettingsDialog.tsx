import { Placeholder } from '../../../lib/Placeholder';
import { useSettings } from '../hooks/useSettings';
import type { SettingsDialogProps } from '../types';

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { settings, update } = useSettings();
  if (!open) return null;
  return (
    <Placeholder name="settings-dialog">
      <button onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>theme</button>
      <button onClick={() => update({ lang: settings.lang === 'en' ? 'ru' : 'en' })}>lang</button>
      <button onClick={onClose}>close</button>
    </Placeholder>
  );
}
