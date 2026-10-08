import { useEffect, useState } from 'react';
import { EditorShell } from '../features/editor';
import { ExportDialog } from '../features/export';
import { FiguresDialog } from '../features/figures';
import { SegmentInspector } from '../features/inspector';
import { PreviewTransport } from '../features/preview';
import { RoutePanel } from '../features/route';
import { SettingsDialog } from '../features/settings';
import { AppHeader, HomeScreen, TripProvider } from '../features/trips';
import { ConnectedVideoPanel } from './ConnectedVideoPanel';
import { ErrorBoundary as Boundary } from './ErrorBoundary';
import { useServices } from './providers/ServicesProvider';
import { navigate } from './router';
import styles from './App.module.css';

type Dialog = 'settings' | 'figures' | 'export';

/** one screen visit: remounted per trip (and for Home) so selection, preview and dialogs reset */
export function Session({ tripId }: { tripId: string | null }) {
  const { map, setPadding } = useServices();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [, setPicking] = useState(false);

  useEffect(() => { if (tripId === null) map.setMode('home'); }, [map, tripId]);

  const close = () => setDialog(null);
  const openTrip = (id: string) => navigate({ name: 'trip', id });
  const onPreview = () => setPreviewing(true);
  const onExport = () => setDialog('export');

  return (
    <TripProvider tripId={tripId}>
      <div className={styles.header}>
        <Boundary name="app-header">
          <AppHeader
            tripId={tripId}
            onGoHome={() => navigate({ name: 'home' })}
            onOpenTrip={openTrip}
            onPreview={onPreview}
            onExport={onExport}
            onOpenSettings={() => setDialog('settings')}
            onOpenFigures={() => setDialog('figures')}
          />
        </Boundary>
      </div>
      <div className={styles.layer}>
        {tripId === null ? (
          <Boundary name="home-screen"><HomeScreen onOpenTrip={openTrip} globe={map} /></Boundary>
        ) : (
          <EditorShell
            routePanel={<Boundary name="route-panel"><RoutePanel selected={selected} onSelect={setSelected} onPickChange={setPicking} map={map} /></Boundary>}
            videoPanel={<Boundary name="video-panel"><ConnectedVideoPanel onPreview={onPreview} onExport={onExport} /></Boundary>}
            inspector={selected === null ? null : <Boundary name="segment-inspector"><SegmentInspector index={selected} onClose={() => setSelected(null)} onManageFigures={() => setDialog('figures')} /></Boundary>}
            transport={previewing ? <Boundary name="preview-transport"><PreviewTransport player={map.player} onExit={() => setPreviewing(false)} /></Boundary> : null}
            onPaddingChange={setPadding}
          />
        )}
        <div className={styles.dialogs}>
          <Boundary name="settings-dialog"><SettingsDialog open={dialog === 'settings'} onClose={close} /></Boundary>
          <Boundary name="figures-dialog"><FiguresDialog open={dialog === 'figures'} onClose={close} /></Boundary>
          <Boundary name="export-dialog"><ExportDialog open={dialog === 'export'} onClose={close} /></Boundary>
        </div>
      </div>
    </TripProvider>
  );
}
