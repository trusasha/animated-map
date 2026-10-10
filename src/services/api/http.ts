export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let tokenSource: (() => Promise<string | null>) | null = null;

/** while signed in, every request carries the user's token */
export const setTokenSource = (source: (() => Promise<string | null>) | null) => { tokenSource = source; };

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await tokenSource?.();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(await authHeaders())) headers.set(k, v);
  const res = await fetch(url, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error || `${res.status} ${res.statusText}`);
  return json;
}

export const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
