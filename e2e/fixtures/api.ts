import type { Page } from '@playwright/test';

const CORS = { 'access-control-allow-origin': '*' };

/** GET /api/trips returns [] for this page only, so the app creates its own trip instead of opening shared server state */
export const emptyTrips = (page: Page) =>
  page.route('**/api/trips', (route) => (route.request().method() === 'GET' ? route.fulfill({ json: [], headers: CORS }) : route.fallback()));

export const DEFAULT_SETTINGS = {};

/** GET /api/settings returns defaults for this page only */
export const defaultSettings = (page: Page) =>
  page.route('**/api/settings', (route) => (route.request().method() === 'GET' ? route.fulfill({ json: DEFAULT_SETTINGS, headers: CORS }) : route.fallback()));
