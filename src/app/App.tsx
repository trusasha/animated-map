import '../ds/index.css';
import { ToastProvider } from '../features/toasts';
import { AuthGate } from './AuthGate';
import { ErrorBoundary } from './ErrorBoundary';
import { I18nBridge } from './providers/I18nBridge';
import { ServicesProvider } from './providers/ServicesProvider';
import { SettingsProvider } from './providers/SettingsProvider';
import { ThemeSync } from './providers/ThemeSync';
import { useRoute } from './router';
import { Session } from './Session';
import styles from './App.module.css';

function Screens() {
  const route = useRoute();
  const tripId = route.name === 'trip' ? route.id : null;
  return <Session key={tripId ?? 'home'} tripId={tripId} />;
}

export function App() {
  return (
    <AuthGate>
      <SettingsProvider>
        <I18nBridge>
          <ThemeSync />
          <ToastProvider>
            <ErrorBoundary>
              <div className={styles.app}>
                <ServicesProvider>
                  <Screens />
                </ServicesProvider>
              </div>
            </ErrorBoundary>
          </ToastProvider>
        </I18nBridge>
      </SettingsProvider>
    </AuthGate>
  );
}
