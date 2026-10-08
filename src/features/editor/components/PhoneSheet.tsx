import type { ReactNode } from 'react';
import { BottomSheet, type Snap } from '../../../ds';
import { useT } from '../../../i18n/react';
import styles from '../EditorShell.module.css';

export interface PhoneSheetProps {
  snap: Snap;
  onSnapChange: (snap: Snap) => void;
  onHeightChange: (px: number, info: { settled: boolean }) => void;
  footer: ReactNode;
  /** which content is shown; a swap scrolls back to the top */
  content: 'route' | 'inspector';
  children: ReactNode;
}

export function PhoneSheet({ snap, onSnapChange, onHeightChange, footer, content, children }: PhoneSheetProps) {
  const { t } = useT();
  return (
    <BottomSheet
      className={styles.sheet}
      snap={snap}
      onSnapChange={onSnapChange}
      onHeightChange={onHeightChange}
      label={t('route.title')}
      contentLabel={t('route.title')}
      expandLabel={t('common.aria.expandPanel')}
      collapseLabel={t('common.aria.collapsePanel')}
      contentKey={content}
      footer={<div className={styles.footer} data-testid="sheet-footer">{footer}</div>}
    >
      {children}
    </BottomSheet>
  );
}
