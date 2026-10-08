import type { Mode } from '../../../domain/types';
import { ListRow } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from './RoutePanel.module.css';

export interface SegmentRowProps {
  mode: Mode;
  /** display name of the figure */
  figure: string;
  color: string;
  building: boolean;
  straight: boolean;
  pace: number | null;
  selected: boolean;
  outOfRange: boolean;
  onSelect: () => void;
}

export function SegmentRow({ mode, figure, color, building, straight, pace, selected, outOfRange, onSelect }: SegmentRowProps) {
  const { t } = useT();
  const meta = building ? t('route.segment.building') : straight ? t('route.segment.straight') : pace !== null ? t('route.segment.pace', { pace }) : undefined;
  return (
    <ListRow
      data-testid="segment-row"
      leading={<span className={styles.sample} data-mode={mode} style={{ borderColor: color }} />}
      title={t('route.segment.label', { mode: t(`common.mode.${mode}`), figure })}
      meta={meta}
      selected={selected}
      outOfRange={outOfRange}
      onSelect={onSelect}
    />
  );
}
