import type { ReactNode } from 'react';
import { useT } from '../../../i18n/react';
import styles from './RoutePanel.module.css';

/** no stops yet: the heading above the search box */
export function EmptyRoute() {
  const { t } = useT();
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>{t('route.empty.title')}</h3>
      <p className={styles.emptyLead}>{t('route.empty.lead')}</p>
    </div>
  );
}

/** below the search box: "or" and the AI composer */
export function EmptyAlternative({ children }: { children: ReactNode }) {
  const { t } = useT();
  return (
    <div className={styles.empty}>
      <div className={styles.or}>{t('route.empty.or')}</div>
      {children}
    </div>
  );
}
