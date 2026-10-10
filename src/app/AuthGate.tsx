import { useEffect, type ReactNode } from 'react';
import { applyTheme } from '../ds';
import { AccountContext, SignInScreen, useAuthState, useSignIn, type Account } from '../features/auth';
import { I18nProvider } from '../i18n/react';
import type { AuthService } from '../services/auth';
import { readThemeHint } from './providers/SettingsProvider';

function SignInForm({ service }: { service: AuthService }) {
  return <SignInScreen {...useSignIn(service)} />;
}

/** settings live behind sign-in, so this screen goes by the browser's language and the stored theme hint */
function SignIn({ service }: { service: AuthService }) {
  useEffect(() => { applyTheme(readThemeHint()); }, []);
  return (
    <I18nProvider lang={navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'}>
      <SignInForm service={service} />
    </I18nProvider>
  );
}

/** with auth on, the app renders only for a signed-in user; with auth off it renders as before */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <SignIn service={auth.service} />;
  const account: Account | null = auth.status === 'signedIn'
    ? { email: auth.session.email, onSignOut: () => void auth.service.signOut().finally(() => location.reload()) }
    : null;
  return <AccountContext value={account}>{children}</AccountContext>;
}
