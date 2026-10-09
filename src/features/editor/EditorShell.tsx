import { useRef, type CSSProperties } from 'react';
import { Card, useViewportMode } from '../../ds';
import { PhoneSheet } from './components/PhoneSheet';
import { useEditorPadding } from './hooks/useEditorPadding';
import { useElementBox } from './hooks/useElementBox';
import { overlayCenter } from './hooks/layout';
import { useSheet } from './hooks/useSheet';
import styles from './EditorShell.module.css';
import type { EditorShellProps } from './types';

export function EditorShell({
  routePanel, videoPanel, inspector, transport, footer, picking, onPaddingChange, onControlsInsetChange, onRefit,
}: EditorShellProps) {
  const { mode } = useViewportMode();
  const previewing = transport !== null;
  const sheet = useSheet(picking);
  const shellRef = useRef<HTMLDivElement>(null);
  const shellBox = useElementBox(shellRef);
  const phone = mode === 'phone';

  const state = {
    mode, inspector: inspector !== null, previewing,
    sheet: phone && !previewing ? sheet.height.live : 0,
  };
  useEditorPadding({ ...state, sheetSettled: phone && !previewing ? sheet.height.settled : 0 }, onPaddingChange, onControlsInsetChange, onRefit);

  const overlay = { '--overlay-top': `${shellBox.top}px`, '--overlay-x': overlayCenter(state) } as CSSProperties;
  const route = <Card className={`${styles.card} ${styles.route}`} scroll>{routePanel}</Card>;
  const video = <Card className={`${styles.card} ${styles.video}`}>{videoPanel}</Card>;
  const inspectorCard = inspector && <Card className={`${styles.card} ${styles.inspector}`} scroll>{inspector}</Card>;

  return (
    <div ref={shellRef} className={styles.shell} style={overlay} data-mode={mode} data-testid="editor-shell">
      {previewing ? (
        <div className={styles.transport}>{transport}</div>
      ) : phone ? (
        <PhoneSheet snap={sheet.snap} onSnapChange={sheet.setSnap} onHeightChange={sheet.onHeightChange} footer={footer} content={inspector ? 'inspector' : 'route'}>
          {inspector ?? <>{routePanel}<div className={styles.divider} />{videoPanel}</>}
        </PhoneSheet>
      ) : mode === 'desktop' ? (
        <>
          <div className={styles.column} data-testid="route-column">{route}{video}</div>
          {inspectorCard && <aside className={styles.right} data-testid="inspector-column">{inspectorCard}</aside>}
        </>
      ) : (
        <div className={styles.column} data-testid={inspectorCard ? 'inspector-column' : 'route-column'}>
          {inspectorCard ?? <>{route}{video}</>}
        </div>
      )}
    </div>
  );
}
