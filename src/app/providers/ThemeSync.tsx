import { useEffect } from 'react';
import { applyTheme } from '../../ds';
import { useSettings } from '../../features/settings';
import { THEME_HINT_KEY } from './SettingsProvider';

export function ThemeSync() {
  const { theme } = useSettings().settings;
  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(THEME_HINT_KEY, theme); } catch { /* hint only */ }
  }, [theme]);
  return null;
}
