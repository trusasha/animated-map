import type { MapStyle } from '../../domain/types';

export interface VideoPanelProps {
  onPreview: () => void;
  onExport: () => void;
  style?: MapStyle;
  speed?: number;
  /** the trip's style/speed change; the owner persists it */
  onChange?: (patch: { style?: MapStyle; speed?: number }) => void;
}
