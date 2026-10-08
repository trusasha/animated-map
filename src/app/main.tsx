import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';

const UI_KEY = 'ui';

const storage = {
  get: () => { try { return localStorage.getItem(UI_KEY); } catch { return null; } },
  set: (v: string) => { try { localStorage.setItem(UI_KEY, v); } catch { /* private mode: the query param still works for this load */ } },
};

const requested = new URLSearchParams(location.search).get(UI_KEY);
if (requested === 'next' || requested === 'legacy') storage.set(requested);

const next = (requested ?? storage.get()) === 'next';
const load = next ? import('./App') : import('../legacy/LegacyApp');

void load.then(({ App }) => {
  createRoot(document.getElementById('root')!).render(<App />);
});
