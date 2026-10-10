import { createClient, type Session } from '@supabase/supabase-js';
import type { AuthConfig, AuthService, AuthSession } from './types';

const toSession = (s: Session | null): AuthSession | null => (s ? { userId: s.user.id, email: s.user.email ?? null } : null);

// back to the same page without the hash, which is where the tokens arrive
const redirectTo = () => location.origin + location.pathname + location.search;

export function createSupabaseAuth({ url, key }: AuthConfig): AuthService {
  const { auth } = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const ok = ({ error }: { error: Error | null }) => { if (error) throw error; };
  return {
    session: async () => toSession((await auth.getSession()).data.session),
    onChange: (cb) => {
      const { data } = auth.onAuthStateChange((_event, s) => cb(toSession(s)));
      return () => data.subscription.unsubscribe();
    },
    signInWithEmail: async (email) => ok(await auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })),
    signInWithGoogle: async () => ok(await auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })),
    signOut: async () => ok(await auth.signOut()),
    accessToken: async () => (await auth.getSession()).data.session?.access_token ?? null,
  };
}
