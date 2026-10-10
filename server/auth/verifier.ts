import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthUser { id: string; email: string | null }

/** turns a bearer token into the user it was issued to, or rejects */
export type Verifier = (token: string) => Promise<AuthUser>;

/**
 * Supabase access tokens signed with the project's asymmetric keys (ES256/RS256), checked against its JWKS.
 * A project still on the legacy HS256 secret has no public keys there: it needs a verifier built on that secret.
 */
export function supabaseVerifier(url: string): Verifier {
  const issuer = `${url.replace(/\/$/, '')}/auth/v1`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' });
    if (!payload.sub) throw new Error('token has no subject');
    return { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : null };
  };
}

/** e2e only: `stub:<id>:<email>` is taken at its word */
export const stubVerifier: Verifier = async (token) => {
  const [kind, id, email] = token.split(':');
  if (kind !== 'stub' || !id) throw new Error('not a stub token');
  return { id, email: email || null };
};
