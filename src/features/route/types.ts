import type { MapService } from '../../services/map';

export interface RoutePanelProps {
  /** index of the selected segment (leg), null = none */
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** starting a map pick (move a stop on the map) */
  onPickChange: (picking: boolean) => void;
  /** the editor map; without it the panel still edits the route but cannot draw it or pick on it */
  map?: MapService;
  /** changing it re-fits the route to the current camera padding (e.g. after the phone sheet settles) */
  fitKey?: number;
}
