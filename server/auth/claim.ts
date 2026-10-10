import type { DbService } from '../db/index.ts';
import type { LogAction } from '../log.ts';
import type { AuthUser } from './verifier.ts';

/**
 * Rows from before accounts existed go to the account whose email is CLAIM_LEGACY_FOR, on its first request.
 * Never to "whoever signs in first": with open sign-ups that could be a stranger.
 */
export function legacyClaimer(db: DbService, claimFor: string | undefined, logAction: LogAction) {
  const email = claimFor?.trim().toLowerCase();
  let settled = !email;
  return async (user: AuthUser) => {
    if (settled || user.email?.toLowerCase() !== email) return;
    settled = true;
    const claimed = await db.claim.claimLegacy(user.id, email!);
    if (!claimed) return;
    console.log(`→ legacy data claimed by ${email}:`, claimed);
    logAction('auth.claim', { email, user: user.id, ...claimed });
  };
}
