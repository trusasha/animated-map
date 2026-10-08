export interface RoutePanelProps {
  /** index of the selected segment (leg), null = none */
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** starting a map pick (move a stop on the map) */
  onPickChange: (picking: boolean) => void;
}
