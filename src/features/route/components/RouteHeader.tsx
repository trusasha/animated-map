import { LinkButton } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './RoutePanel.module.css';

export interface RouteHeaderProps {
  count: number;
  composerOpen: boolean;
  onToggleComposer: () => void;
}

export function RouteHeader({ count, composerOpen, onToggleComposer }: RouteHeaderProps) {
  const { t } = useT();
  return (
    <div className={styles.header}>
      <h2 className={styles.headerTitle}>{t('route.title')}</h2>
      <span className={styles.count}>{t('common.stops', { count })}</span>
      {count > 0 && (
        <LinkButton size="sm" className={styles.headerAction} onClick={onToggleComposer}>
          {composerOpen ? t('route.closeComposer') : t('route.describeWithAi')}
        </LinkButton>
      )}
    </div>
  );
}
