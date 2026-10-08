import { useEffect, useState } from 'react';
import { applyTheme, type ThemeMode } from '../ds/lib/theme.ts';
import { forceCoarse as applyForceCoarse, useViewportMode } from '../ds/hooks/useViewportMode.ts';
import { demos } from './demos.ts';
import { Swatches } from './Swatches.tsx';
import { Toolbar, WIDTHS } from './Toolbar.tsx';

export function Gallery() {
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [width, setWidth] = useState<number | 'full'>(WIDTHS[2]);
  const [forceCoarse, setForceCoarse] = useState(false);
  const { mode, coarse } = useViewportMode();

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => applyForceCoarse(forceCoarse), [forceCoarse]);

  return (
    <div className="gallery">
      <Toolbar
        theme={theme}
        onTheme={setTheme}
        width={width}
        onWidth={setWidth}
        coarse={forceCoarse}
        onCoarse={setForceCoarse}
        status={`mode ${mode}${coarse || forceCoarse ? ' · coarse' : ''}`}
      />
      <main className="gallery-main">
        <div className="gallery-frame" style={{ width: width === 'full' ? '100%' : width }} data-testid="gallery-frame">
          <Swatches theme={theme} />
          {demos.length === 0 && <p className="gallery-empty">No demos yet. Add src/ds/components/Name/Name.demo.tsx.</p>}
          {demos.map(({ name, title, Demo }) => (
            <section key={name} className="gallery-section" data-testid={`demo-${name}`} aria-labelledby={`h-${name}`}>
              <h2 id={`h-${name}`}>{title}</h2>
              <Demo />
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
