import { Button } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './HomeHero.module.css';

export interface HomeHeroProps { busy: boolean; onNewTrip: () => void }

export function HomeHero({ busy, onNewTrip }: HomeHeroProps) {
  const { t } = useT();
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>{t('home.title')}</h1>
      <p className={styles.lead}>{t('home.lead')}</p>
      <Button size="lg" loading={busy} onClick={onNewTrip}>{t('home.newTrip')}</Button>
    </div>
  );
}
