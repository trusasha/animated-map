import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { UserSettings } from '../../../domain/types';
import { DEFAULT_SETTINGS } from '../../../domain/settings';
import { api } from '../../../services/api';
import { reportError } from '../../toasts';

const SAVE_DEBOUNCE_MS = 400;

export interface SettingsApi {
  settings: UserSettings;
  /** applies at once, saved after a short pause; a failed save rolls back */
  update: (patch: Partial<UserSettings>) => void;
}

export const SettingsContext = createContext<SettingsApi>({ settings: DEFAULT_SETTINGS, update: () => {} });

export const useSettings = () => useContext(SettingsContext);

export function useSettingsController(initial: UserSettings): SettingsApi {
  const [settings, setSettings] = useState(initial);
  const latest = useRef(initial);
  const confirmed = useRef(initial);
  const pending = useRef<Partial<UserSettings>>({});
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(() => {
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    const sent = latest.current;
    api.log('settings.change', patch);
    api.saveSettings(sent).then(() => { confirmed.current = sent; }).catch((e) => {
      latest.current = confirmed.current;
      setSettings(confirmed.current);
      reportError(e);
    });
  }, []);

  const update = useCallback((patch: Partial<UserSettings>) => {
    latest.current = { ...latest.current, ...patch };
    pending.current = { ...pending.current, ...patch };
    setSettings(latest.current);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, SAVE_DEBOUNCE_MS);
  }, [flush]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    flush();
  }, [flush]);

  return { settings, update };
}
