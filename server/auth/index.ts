import type { RequestHandler } from 'express';
import type { DbService } from '../db/index.ts';
import type { LogAction } from '../log.ts';
import { legacyClaimer } from './claim.ts';
import { requireUser } from './middleware.ts';
import { stubVerifier, supabaseVerifier } from './verifier.ts';

/** what the client needs to sign in; null when auth is off */
export type PublicAuthConfig = { url: string; key: string } | null;

export interface Auth { config: PublicAuthConfig; middleware: RequestHandler | null }

/** no SUPABASE_URL / VITE_SUPABASE_URL: auth off, everyone is the single local user */
export async function createAuth(db: DbService, logAction: LogAction, env = process.env): Promise<Auth> {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (!url) return { config: null, middleware: null };
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const stub = env.AUTH_VERIFIER === 'stub';
  if (stub && env.NODE_ENV === 'production') throw new Error('AUTH_VERIFIER=stub is for tests and refuses to run in production');
  const claimedBy = await db.claim.claimedBy();
  if (!claimedBy) console.log(env.CLAIM_LEGACY_FOR ? `→ legacy data waits for ${env.CLAIM_LEGACY_FOR}` : '→ legacy data stays unowned: set CLAIM_LEGACY_FOR=<email> to claim it');
  const verify = stub ? stubVerifier : supabaseVerifier(url);
  return { config: { url, key }, middleware: requireUser(verify, legacyClaimer(db, claimedBy ? undefined : env.CLAIM_LEGACY_FOR, logAction)) };
}
