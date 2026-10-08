import type { TripPlayer } from '../../services/map';

/** mounted only while previewing: starts on mount, stops on unmount */
export interface PreviewTransportProps {
  onExit: () => void;
  /** the shared map's player; the composition root passes `map.player` */
  player?: TripPlayer;
}
