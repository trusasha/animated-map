import { useState } from 'react';
import type { Snap } from '../../../ds';

/** phone sheet snap and height: live for the map controls, settled for the camera */
export function useSheet(picking: boolean) {
  const [snap, setSnap] = useState<Snap>('collapsed');
  const [height, setHeight] = useState({ live: 0, settled: 0 });
  const [wasPicking, setWasPicking] = useState(picking);

  if (picking !== wasPicking) {
    setWasPicking(picking);
    if (picking && snap === 'full') setSnap('collapsed');
  }

  return {
    snap,
    setSnap,
    height,
    onHeightChange: (px: number, { settled }: { settled: boolean }) =>
      setHeight((h) => ({ live: px, settled: settled ? px : h.settled })),
  };
}
