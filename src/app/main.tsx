import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';

void import('../legacy/LegacyApp').then(({ App }) => {
  createRoot(document.getElementById('root')!).render(<App />);
});
