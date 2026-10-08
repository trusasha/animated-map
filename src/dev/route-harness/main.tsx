import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../ds/index.css';
import styles from '../../app/App.module.css';
import { I18nBridge } from '../../app/providers/I18nBridge';
import { ServicesProvider, useServices } from '../../app/providers/ServicesProvider';
import { SettingsProvider } from '../../app/providers/SettingsProvider';
import { RoutePanel } from '../../features/route';
import { ToastProvider } from '../../features/toasts';
import { TripProvider } from '../../features/trips';

/** dev-only: the route panel over the real map and trip autosave. ?trip=<id> opens a trip on the server */
function Panel() {
  const { map } = useServices();
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div style={{ position: 'absolute', inset: 0, width: 380, padding: 16, overflow: 'auto', background: 'var(--surface-page)' }}>
      <RoutePanel selected={selected} onSelect={setSelected} onPickChange={() => {}} map={map} />
      <output data-testid="selected">{String(selected)}</output>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <I18nBridge>
        <ToastProvider>
          <div className={styles.app} style={{ position: 'fixed', inset: 0 }}>
            <ServicesProvider>
              <TripProvider tripId={new URLSearchParams(location.search).get('trip')}>
                <Panel />
              </TripProvider>
            </ServicesProvider>
          </div>
        </ToastProvider>
      </I18nBridge>
    </SettingsProvider>
  </StrictMode>,
);
