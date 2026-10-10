import type { AuthService, AuthSession } from '../../services/auth';

export type AuthState =
  | { status: 'loading' }
  /** auth is off: the single local user, as before accounts */
  | { status: 'off' }
  | { status: 'signedOut'; service: AuthService }
  | { status: 'signedIn'; service: AuthService; session: AuthSession };

/** the signed-in account for the header; null when auth is off */
export interface Account { email: string | null; onSignOut: () => void }

export type SignInStep = 'idle' | 'sending' | 'sent';

export interface SignInScreenProps {
  email: string;
  step: SignInStep;
  error: string | null;
  onEmailChange: (email: string) => void;
  onSendLink: () => void;
  onGoogle: () => void;
  onOtherEmail: () => void;
}
