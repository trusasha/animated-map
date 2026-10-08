import type { ReactNode } from 'react';
import { useSettings } from '../../features/settings';
import { I18nProvider } from '../../i18n/react';

export function I18nBridge({ children }: { children: ReactNode }) {
  const { lang } = useSettings().settings;
  return <I18nProvider lang={lang}>{children}</I18nProvider>;
}
