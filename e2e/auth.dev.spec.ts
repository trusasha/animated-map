import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { stubNet } from './fixtures/net';

// its own server with auth on and the stub verifier: the shared dev server stays the auth-off local user
const PORT = Number(process.env.E2E_AUTH_PORT ?? Number(process.env.E2E_DEV_PORT ?? 5175) + 10);
const BASE = `http://127.0.0.1:${PORT}`;
const SUPABASE = 'http://stub-supabase.test';
const A = { Authorization: 'Bearer stub:user-a:a@example.com' };
const B = { Authorization: 'Bearer stub:user-b:b@example.com' };
const DATA = { stops: [], style: 'satellite', speed: 1, format: '16:9' };

test.describe.configure({ mode: 'serial' });
test.use({ baseURL: BASE, locale: 'en-US' });

let server: ChildProcess;

test.beforeAll(async ({ request }) => {
  test.setTimeout(90_000);
  server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env, NODE_ENV: 'development', PORT: String(PORT), HMR_PORT: String(PORT + 1), DATA_DIR: `.e2e-data-${PORT}`, DATABASE_URL: '',
      SUPABASE_URL: SUPABASE, SUPABASE_PUBLISHABLE_KEY: 'stub-key', AUTH_VERIFIER: 'stub',
    },
  });
  await expect.poll(() => request.get(`${BASE}/api/config`).then((r) => r.ok(), () => false), { timeout: 60_000 }).toBe(true);
});

test.afterAll(() => { server?.kill(); });

/** a supabase-js session in storage, as if the user came back from a magic link; its token is a stub token */
async function signIn(page: Page, id: string, email: string) {
  await page.route(`${SUPABASE}/**`, (r) =>
    r.request().url().includes('/auth/v1/logout') ? r.fulfill({ status: 204 }) : r.fulfill({ status: 500, json: { error: 'no real Supabase in e2e' } }));
  const session = {
    access_token: `stub:${id}:${email}`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
  };
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('sb-stub-supabase-auth-token', s);
  }, JSON.stringify(session));
}

const titles = async (request: APIRequestContext, headers: Record<string, string>) =>
  ((await (await request.get('/api/trips', { headers })).json()) as { title: string }[]).map((t) => t.title);

test('config is public and names the auth project; everything else needs a token', async ({ request }) => {
  expect((await (await request.get('/api/config')).json()).auth).toEqual({ url: SUPABASE, key: 'stub-key' });
  for (const path of ['/api/trips', '/api/models', '/api/settings']) expect((await request.get(path)).status()).toBe(401);
  expect((await request.post('/api/parse', { data: { text: 'x' } })).status()).toBe(401);
  expect((await request.get('/api/trips', { headers: { Authorization: 'Bearer forged' } })).status()).toBe(401);
});

test("user A's trip, figure and settings are invisible to user B", async ({ request }) => {
  const trip = await (await request.post('/api/trips', { headers: A, data: { title: 'A only', data: DATA } })).json();
  expect(await titles(request, A)).toContain('A only');
  expect(await titles(request, B)).not.toContain('A only');
  expect((await request.get(`/api/trips/${trip.id}`, { headers: B })).status()).toBe(404);
  await request.put(`/api/trips/${trip.id}`, { headers: B, data: { title: 'hijacked', data: DATA } });
  await request.delete(`/api/trips/${trip.id}`, { headers: B });
  expect((await (await request.get(`/api/trips/${trip.id}`, { headers: A })).json()).title).toBe('A only');

  const glb = readFileSync(new URL('./fixtures/box.glb', import.meta.url));
  const model = await (await request.post('/api/models/upload?name=Box', { headers: { ...A, 'Content-Type': 'model/gltf-binary' }, data: glb })).json();
  expect(model.url).toMatch(/^\/uploads\/user-a\/[\w-]+\.glb$/);
  expect(await (await request.get('/api/models', { headers: B })).json()).toEqual([]);
  expect((await request.put(`/api/models/${model.id}`, { headers: B, data: { name: 'x' } })).status()).toBe(404);

  await request.put('/api/settings', { headers: A, data: { lang: 'en' } });
  expect((await (await request.get('/api/settings', { headers: B })).json()).lang).toBe('ru');
  expect((await (await request.get('/api/settings', { headers: A })).json()).lang).toBe('en');
});

test('signed out: the sign-in screen sends a magic link and says to check email', async ({ page }) => {
  await stubNet(page);
  let otp: { email?: string } | null = null;
  await page.route(`${SUPABASE}/**`, (r) => {
    if (r.request().url().includes('/auth/v1/otp')) { otp = r.request().postDataJSON(); return r.fulfill({ json: {} }); }
    return r.fulfill({ status: 500, json: {} });
  });
  await page.goto('/?ui=next&e2e');
  const screen = page.getByTestId('sign-in');
  await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Sign in to keep your trips.');
  await expect(page.getByTestId('home-screen')).toHaveCount(0);
  await screen.getByRole('button', { name: 'Send link' }).click();
  await expect(screen.getByRole('alert')).toHaveText('Enter a valid email address.');
  await screen.getByLabel('Email').fill('me@example.com');
  await screen.getByRole('button', { name: 'Send link' }).click();
  await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Check your email.');
  await expect(screen).toContainText('me@example.com');
  expect(otp).toMatchObject({ email: 'me@example.com' });
  const google = page.waitForRequest((r) => r.url().startsWith(`${SUPABASE}/auth/v1/authorize?provider=google`));
  await screen.getByRole('button', { name: 'Use another email' }).click();
  await screen.getByRole('button', { name: 'Continue with Google' }).click();
  await google;
});

test('signed in: Home lists only my trips, the menu shows my email and signs out', async ({ page, request }) => {
  await request.post('/api/trips', { headers: B, data: { title: 'B only', data: DATA } });
  await stubNet(page);
  await signIn(page, 'user-a', 'a@example.com');
  await page.goto('/?ui=next&e2e');
  const rows = page.getByTestId('trip-row');
  await expect(rows.filter({ hasText: 'A only' })).toBeVisible();
  await expect(rows.filter({ hasText: 'B only' })).toHaveCount(0);
  await page.getByRole('banner').getByRole('button', { name: 'More' }).click();
  await expect(page.getByRole('menuitem', { name: 'Signed in as a@example.com' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByTestId('sign-in')).toBeVisible();
});
