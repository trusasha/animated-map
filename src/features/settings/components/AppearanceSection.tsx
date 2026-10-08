import { Segmented } from '../../../ds';
import type { Lang, Theme } from '../../../domain/types';
import { useT } from '../../../i18n/react';
import styles from './Sections.module.css';

interface Props {
  theme: Theme;
  lang: Lang;
  onThemeChange: (theme: Theme) => void;
  onLangChange: (lang: Lang) => void;
}

export function AppearanceSection({ theme, lang, onThemeChange, onLangChange }: Props) {
  const { t } = useT();
  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>{t('settings.appearance.title')}</h3>
      <Segmented
        className={styles.narrow}
        label={t('settings.appearance.title')}
        value={theme}
        onChange={onThemeChange}
        options={[
          { value: 'light', label: t('settings.appearance.light') },
          { value: 'dark', label: t('settings.appearance.dark') },
          { value: 'system', label: t('settings.appearance.system') },
        ]}
      />
      <h3 className={styles.heading}>{t('settings.language.title')}</h3>
      <Segmented
        className={styles.narrow}
        label={t('settings.language.title')}
        value={lang}
        onChange={onLangChange}
        options={[
          { value: 'ru', label: t('settings.language.ru') },
          { value: 'en', label: t('settings.language.en') },
        ]}
      />
    </section>
  );
}
