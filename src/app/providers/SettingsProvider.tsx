import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../domain/settings';
import type { UserSettings } from '../../domain/types';
import { SettingsContext, useSettingsController } from '../../features/settings';
import { reportError } from '../../features/toasts';
import { api } from '../../services/api';
import { applyTheme, type ThemeMode } from '../../ds';

export const THEME_HINT_KEY = 'theme';

const readHint = (): ThemeMode => {
  try {
    const v = localStorage.getItem(THEME_HINT_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

function Loaded({ initial, children }: { initial: UserSettings; children: ReactNode }) {
  return <SettingsContext value={useSettingsController(initial)}>{children}</SettingsContext>;
}

/** the shell waits for the server's settings; the stored theme hint only avoids a flash meanwhile */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [initial, setInitial] = useState<UserSettings | null>(null);

  useEffect(() => {
    applyTheme(readHint());
    api.settings().then((s) => setInitial(normalizeSettings(s))).catch((e) => {
      reportError(e);
      setInitial(DEFAULT_SETTINGS);
    });
  }, []);

  return initial ? <Loaded initial={initial}>{children}</Loaded> : null;
}
