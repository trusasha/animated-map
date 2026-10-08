import { useRef, useState } from 'react';
import { ConfirmDialog, Input } from '../../../ds';
import { useT } from '../../../i18n/react';

export interface RenameDialogProps {
  /** current name; null = closed */
  name: string | null;
  onRename: (name: string) => void;
  onClose: () => void;
}

export function RenameDialog({ name, onRename, onClose }: RenameDialogProps) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ from: string | null; text: string }>({ from: null, text: '' });
  const text = draft.from === name ? draft.text : (name ?? '');
  const submit = () => {
    const next = text.trim();
    if (next) onRename(next);
  };

  return (
    <ConfirmDialog
      open={name !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={t('trips.rename.title')}
      confirmLabel={t('common.actions.save')}
      cancelLabel={t('common.actions.cancel')}
      initialFocus={input}
      onConfirm={submit}
      body={(
        <Input
          ref={input}
          aria-label={t('trips.rename.label')}
          placeholder={t('trips.rename.placeholder')}
          value={text}
          onChange={(e) => setDraft({ from: name, text: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
      )}
    />
  );
}
