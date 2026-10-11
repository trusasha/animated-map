import type { RequestHandler } from 'express';
import type { AuthUser, Verifier } from './verifier.ts';

const BEARER = /^Bearer (.+)$/;
// the id names the user's uploads folder
const SAFE_ID = /^[\w-]{1,64}$/;

/** for everything under /api except /api/config: no valid token, no access; sets res.locals.owner and .token */
export function requireUser(verify: Verifier, onUser: (user: AuthUser) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    if (req.path === '/config') return next();
    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    const deny = () => void res.status(401).json({ error: 'sign in required' });
    if (!token) return deny();
    verify(token).then(
      (user) => {
        if (!SAFE_ID.test(user.id)) return deny();
        res.locals.owner = user.id;
        res.locals.token = token;
        onUser(user).then(() => next(), next);
      },
      deny,
    );
  };
}
