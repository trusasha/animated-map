import { createRoot } from 'react-dom/client';
import { App } from './App';

// a tab opened before a deploy asks for code chunks the new build no longer has (404): load the new build, at most
// once a minute so a chunk that is really missing can't loop
addEventListener('vite:preloadError', (e) => {
  try {
    if (Date.now() - Number(sessionStorage.getItem('ta.reloadedForDeploy') ?? 0) < 60_000) return;
    sessionStorage.setItem('ta.reloadedForDeploy', String(Date.now()));
  } catch { return; }
  e.preventDefault();
  location.reload();
});

createRoot(document.getElementById('root')!).render(<App />);
