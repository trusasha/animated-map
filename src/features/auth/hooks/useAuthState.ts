import { useEffect, useState } from 'react';
import { api, setTokenSource } from '../../../services/api';
import { loadAuthService, type AuthSession } from '../../../services/auth';
import type { AuthState } from '../types';

/** reads /api/config, then follows the Supabase session; the API client sends its token from then on */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};
    let lastUser: string | null = null;
    api.config()
      .then((c) => loadAuthService(c.auth), () => null)
      .then((service) => {
        if (!alive) return;
        if (!service) return setState({ status: 'off' });
        setTokenSource(service.accessToken);
        const apply = (session: AuthSession | null) => {
          // stores outside React (figures, trips) still hold the previous account's data
          if (session && lastUser && session.userId !== lastUser) return location.reload();
          if (session) lastUser = session.userId;
          setState((prev) =>
            session
              ? prev.status === 'signedIn' && prev.session.userId === session.userId && prev.session.email === session.email ? prev : { status: 'signedIn', service, session }
              : prev.status === 'signedOut' ? prev : { status: 'signedOut', service });
        };
        unsubscribe = service.onChange(apply);
        void service.session().then(apply);
      });
    return () => { alive = false; unsubscribe(); };
  }, []);

  return state;
}
