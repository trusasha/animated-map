import { Placeholder } from '../../../lib/Placeholder';
import type { AppHeaderProps } from '../types';

export function AppHeader({ tripId, onGoHome, onPreview, onExport, onOpenSettings, onOpenFigures }: AppHeaderProps) {
  return (
    <Placeholder name="app-header">
      <button onClick={onGoHome}>home</button>
      {tripId && <button onClick={onPreview}>preview</button>}
      {tripId && <button onClick={onExport}>export</button>}
      <button onClick={onOpenSettings}>settings</button>
      <button onClick={onOpenFigures}>figures</button>
    </Placeholder>
  );
}
