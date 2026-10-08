import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Lang } from '../domain/types';
import { translator, type TFn } from '.';

interface I18n { lang: Lang; t: TFn }

const DEFAULT_LANG: Lang = 'ru';
const Ctx = createContext<I18n>({ lang: DEFAULT_LANG, t: translator(DEFAULT_LANG) });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: translator(lang) }), [lang]);
  return <Ctx value={value}>{children}</Ctx>;
}

export const useT = () => useContext(Ctx);
