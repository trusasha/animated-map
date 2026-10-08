import { Placeholder } from '../../lib/Placeholder';
import type { VideoPanelProps } from './types';

export function VideoPanel({ onPreview, onExport }: VideoPanelProps) {
  return <Placeholder name="video-panel"><button onClick={onPreview}>preview</button><button onClick={onExport}>export</button></Placeholder>;
}
