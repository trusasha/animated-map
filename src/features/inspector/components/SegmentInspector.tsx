import { BackLink, IconButton, LinkButton, useViewportMode } from '../../../ds';
import { useT } from '../../../i18n/react';
import { FigurePicker } from '../../figures';
import { SHOW_LINE_COLORS } from '../../settings';
import type { SegmentInspectorProps } from '../types';
import { useInspector } from '../useInspector';
import { ColorSection } from './ColorSection';
import styles from './Inspector.module.css';
import { PaceSection } from './PaceSection';
import { SmoothingSection } from './SmoothingSection';
import { TravelBySection } from './TravelBySection';

export function SegmentInspector({ index, onClose, onManageFigures }: SegmentInspectorProps) {
  const { t } = useT();
  const { mode: viewport } = useViewportMode();
  const s = useInspector(index);
  if (!s) return null;
  const wide = viewport === 'desktop';
  return (
    <div className={styles.root} data-testid="segment-inspector">
      {!wide && <BackLink label={t('inspector.allStops')} onClick={onClose} />}
      <header className={styles.head}>
        <div className={styles.titles}>
          <span className={styles.caption}>{t(wide ? 'inspector.caption' : 'inspector.captionShort', { index: index + 1, total: s.total })}</span>
          <h2 className={styles.title}>{t('inspector.title', { from: s.from, to: s.to })}</h2>
        </div>
        {wide && <IconButton icon="x" label={t('inspector.deselect')} onClick={onClose} />}
      </header>
      <TravelBySection mode={s.leg.mode} straight={s.straight} onChange={s.setMode} />
      <section className={styles.section}>
        <h3 className={styles.label}>{t('inspector.figure')}</h3>
        <FigurePicker mode={s.leg.mode} value={s.leg.figure} onChange={s.setFigure} onAddOwn={onManageFigures} />
        <div className={styles.actions}>
          <LinkButton size="sm" onClick={onManageFigures}>{t('inspector.manageFigures')}</LinkButton>
        </div>
      </section>
      {SHOW_LINE_COLORS && (
        <ColorSection
          mode={s.leg.mode}
          color={s.color}
          overridden={s.overridden}
          onChange={s.setColor}
          onUseDefault={s.useDefaultColor}
          onApplyAll={s.applyColorToAll}
        />
      )}
      <PaceSection value={s.speed} onChange={s.previewSpeed} onCommit={s.commitSpeed} />
      <SmoothingSection mode={s.leg.mode} value={s.smooth} onChange={s.previewSmooth} onCommit={s.commitSmooth} />
    </div>
  );
}
