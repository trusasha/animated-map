import { useViewportMode } from '../../ds';
import { useEditorPadding } from './hooks/useEditorPadding';
import styles from './EditorShell.module.css';
import type { EditorShellProps } from './types';

export function EditorShell({ routePanel, videoPanel, inspector, transport, onPaddingChange }: EditorShellProps) {
  const { mode } = useViewportMode();
  const previewing = transport !== null;
  useEditorPadding(inspector !== null, previewing, onPaddingChange);

  const list = <>{routePanel}{videoPanel}</>;
  return (
    <div className={styles.shell} data-mode={mode} data-testid="editor-shell">
      {previewing ? (
        <div className={styles.transport}>{transport}</div>
      ) : mode === 'desktop' ? (
        <>
          <div className={styles.column}>{list}</div>
          {inspector && <aside className={styles.right}>{inspector}</aside>}
        </>
      ) : (
        <div className={mode === 'phone' ? styles.sheet : styles.column}>{inspector ?? list}</div>
      )}
    </div>
  );
}
