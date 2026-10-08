import type { ExportLongSide, Lang, Mode, Theme, UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  lang: 'ru',
  figures: { air: 'airplane', ground: 'car', water: 'ship' },
  colors: { air: '#0075de', ground: '#dd5b00', water: '#2a9d99' },
  flyKm: 600,
  exportLongSide: 1920,
};

export const FLY_KM_RANGE = { min: 100, max: 2000 } as const;
const MODES: Mode[] = ['air', 'ground', 'water'];
const THEMES: Theme[] = ['light', 'dark', 'system'];
const LANGS: Lang[] = ['ru', 'en'];
const SIDES: ExportLongSide[] = [1080, 1920];
const HEX = /^#[0-9a-f]{6}$/i;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const pick = <T,>(v: unknown, allowed: readonly T[], fallback: T) => (allowed.includes(v as T) ? (v as T) : fallback);

/** anything stored or received becomes a complete, valid UserSettings; unknown keys are dropped */
export function normalizeSettings(raw: unknown): UserSettings {
  const r = isObj(raw) ? raw : {};
  const figs = isObj(r.figures) ? r.figures : {}, cols = isObj(r.colors) ? r.colors : {};
  const per = <T,>(src: Record<string, unknown>, base: Record<Mode, T>, ok: (v: unknown) => boolean) =>
    Object.fromEntries(MODES.map((m) => [m, ok(src[m]) ? src[m] : base[m]])) as Record<Mode, T>;
  const km = typeof r.flyKm === 'number' && Number.isFinite(r.flyKm) ? r.flyKm : DEFAULT_SETTINGS.flyKm;
  return {
    theme: pick(r.theme, THEMES, DEFAULT_SETTINGS.theme),
    lang: pick(r.lang, LANGS, DEFAULT_SETTINGS.lang),
    figures: per(figs, DEFAULT_SETTINGS.figures, (v) => typeof v === 'string' && v !== ''),
    colors: per(cols, DEFAULT_SETTINGS.colors, (v) => typeof v === 'string' && HEX.test(v)),
    flyKm: Math.min(FLY_KM_RANGE.max, Math.max(FLY_KM_RANGE.min, km)),
    exportLongSide: pick(r.exportLongSide, SIDES, DEFAULT_SETTINGS.exportLongSide),
  };
}
