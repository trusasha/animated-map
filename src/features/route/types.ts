export interface RoutePanelProps {
  /** index of the selected segment (leg), null = none */
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** starting a map pick (move a stop on the map) */
  onPickChange: (picking: boolean) => void;
}

/** what the composer needs from the open trip (P3-03's trip context provides it) */
export interface ComposerTripApi {
  trip: Trip;
  /** applies `fn` to the latest trip, title included */
  update: (fn: (t: Trip) => Trip) => void;
}

export interface ComposerProps extends ComposerTripApi {
  /** the route was replaced: the host closes the composer and refits the map */
  onDone?: () => void;
}
