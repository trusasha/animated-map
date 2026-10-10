export interface AuthSession { userId: string; email: string | null }

/** where to sign in, from /api/config; absent when auth is off */
export interface AuthConfig { url: string; key: string }

export interface AuthService {
  session(): Promise<AuthSession | null>;
  /** also fires once the session from a magic-link or OAuth redirect has been read from the URL */
  onChange(cb: (session: AuthSession | null) => void): () => void;
  /** sends a magic link that comes back to this page */
  signInWithEmail(email: string): Promise<void>;
  /** leaves the page for Google and comes back signed in */
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  /** fresh (refreshed if needed) token for our API, null when signed out */
  accessToken(): Promise<string | null>;
}
