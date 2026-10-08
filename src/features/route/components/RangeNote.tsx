import { LinkButton } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './RoutePanel.module.css';

export interface RangeNoteProps {
  /** stop indices the video covers, null = the whole route */
  range: { from: number; to: number } | null;
  onUseWhole: () => void;
}

export function RangeNote({ range, onUseWhole }: RangeNoteProps) {
  const { t } = useT();
  return (
    <p className={styles.note}>
      <span className={styles.dot} aria-hidden />
      <span className={styles.noteText}>
        {range ? t('route.range.set', { from: range.from + 1, to: range.to + 1 }) : t('route.range.whole')}
      </span>
      {range && <LinkButton size="sm" onClick={onUseWhole}>{t('route.range.useWhole')}</LinkButton>}
    </p>
  );
}
