import type { ThemeMode } from '../ds/lib/theme.ts';

export const WIDTHS = [390, 768, 1024, 1440] as const;
const THEMES: ThemeMode[] = ['light', 'dark', 'system'];

type Props = {
  theme: ThemeMode;
  onTheme: (t: ThemeMode) => void;
  width: number | 'full';
  onWidth: (w: number | 'full') => void;
  coarse: boolean;
  onCoarse: (v: boolean) => void;
  status: string;
};

export function Toolbar({ theme, onTheme, width, onWidth, coarse, onCoarse, status }: Props) {
  return (
    <header className="gallery-toolbar">
      <strong>DS gallery</strong>
      <div role="group" aria-label="Theme">
        {THEMES.map((t) => (
          <button key={t} type="button" aria-pressed={theme === t} onClick={() => onTheme(t)}>
            {t}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Width">
        {WIDTHS.map((w) => (
          <button key={w} type="button" aria-pressed={width === w} onClick={() => onWidth(w)}>
            {w}
          </button>
        ))}
        <button type="button" aria-pressed={width === 'full'} onClick={() => onWidth('full')}>
          full
        </button>
      </div>
      <label>
        <input type="checkbox" checked={coarse} onChange={(e) => onCoarse(e.target.checked)} /> coarse pointer
      </label>
      <span className="gallery-status">{status}</span>
    </header>
  );
}
