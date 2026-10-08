import { Placeholder } from '../../../lib/Placeholder';
import type { PreviewTransportProps } from '../types';

export function PreviewTransport({ onExit }: PreviewTransportProps) {
  return <Placeholder name="preview-transport"><button onClick={onExit}>exit</button></Placeholder>;
}
