import { useT } from '../../../i18n/react';
import { useTripContext } from '../hooks/useTripContext';
import styles from './SaveStatusLabel.module.css';

const KEYS = { idle: 'trips.header.saved', saving: 'trips.header.saving', saved: 'trips.header.saved', error: 'trips.header.saveFailed' } as const;

/** autosave state of the open trip; the header shows it, the phone sheet footer reuses it */
export function SaveStatusLabel() {
  const { t } = useT();
  const { saveStatus } = useTripContext();
  return <span className={styles.status} role="status">{t(KEYS[saveStatus])}</span>;
}
