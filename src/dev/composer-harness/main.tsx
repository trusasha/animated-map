import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ds/index.css';
import type { Trip } from '../../domain/types';
import { Composer } from '../../features/route';
import { ToastProvider } from '../../features/toasts';
import { I18nProvider } from '../../i18n/react';

/** dev-only: mounts Composer on a local trip. ?title=<name>&stops=<n>&range=1 seed the trip */
const params = new URLSearchParams(location.search);
const count = Number(params.get('stops') ?? 0);
const stops = Array.from({ length: count }, (_, i) => ({ id: `s${i}`, name: `Old ${i + 1}`, lng: i, lat: i }));

const initial: Trip = {
  id: 'harness',
  title: params.get('title') ?? 'My trip',
  data: {
    stops, style: 'satellite', speed: 1, format: '9:16',
    range: params.has('range') && count > 2 ? { from: 's0', to: `s${count - 1}` } : undefined,
  },
};

function Harness() {
  const [trip, setTrip] = useState(initial);
  return (
    <I18nProvider lang="en">
      <ToastProvider>
        <div style={{ maxWidth: 420, padding: 16 }}>
          <Composer trip={trip} update={(fn) => setTrip(fn)} />
          <pre data-testid="trip">{JSON.stringify({ title: trip.title, stops: trip.data.stops, range: trip.data.range ?? null })}</pre>
        </div>
      </ToastProvider>
    </I18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
