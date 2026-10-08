import { Placeholder } from '../../../lib/Placeholder';
import type { RoutePanelProps } from '../types';

export function RoutePanel({ selected, onSelect }: RoutePanelProps) {
  return <Placeholder name="route-panel"><button onClick={() => onSelect(selected === null ? 0 : null)}>select</button></Placeholder>;
}
