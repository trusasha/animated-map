import type { AuthConfig, AuthService } from './types';

export type { AuthConfig, AuthService, AuthSession } from './types';

/** null when auth is off; supabase-js is only downloaded when it is on */
export async function loadAuthService(config: AuthConfig | null | undefined): Promise<AuthService | null> {
  if (!config) return null;
  const { createSupabaseAuth } = await import('./supabase');
  return createSupabaseAuth(config);
}
