import { useTripContext } from '../features/trips';
import { VideoPanel, type VideoPanelProps } from '../features/video-panel';

/** binds the video panel to the open trip's style and speed */
export function ConnectedVideoPanel(props: Pick<VideoPanelProps, 'onPreview' | 'onExport'>) {
  const { trip, update } = useTripContext();
  return (
    <VideoPanel
      {...props}
      style={trip?.data.style}
      speed={trip?.data.speed}
      onChange={(patch) => update((d) => ({ ...d, ...patch }))}
    />
  );
}
