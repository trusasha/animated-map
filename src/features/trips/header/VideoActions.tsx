import { Button } from '../../../ds';
import { useT } from '../../../i18n/react';
import { useTripContext } from '../hooks/useTripContext';
import type { VideoActionsProps } from '../types';

/** Preview + Export for the open trip; they wait while the route builds or has fewer than 2 stops */
export function VideoActions({ onPreview, onExport, short, className }: VideoActionsProps) {
  const { t } = useT();
  const { trip, routing } = useTripContext();
  const ready = !!trip && trip.data.stops.length >= 2 && !routing;
  return (
    <>
      <Button variant="secondary" className={className} disabled={!ready} onClick={onPreview}>{t('trips.header.preview')}</Button>
      <Button className={className} disabled={!ready} onClick={onExport}>{t(short ? 'trips.header.export' : 'trips.header.exportVideo')}</Button>
    </>
  );
}
