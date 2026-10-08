import { useState } from 'react';
import type { CustomModel } from '../../../domain/types';

export type FiguresView = { name: 'list' } | { name: 'add' } | { name: 'edit'; id: string };

/** which screen of the dialog is shown; resets to the list whenever the dialog closes */
export function useFiguresDialog(models: CustomModel[], onClose: () => void) {
  const [view, setView] = useState<FiguresView>({ name: 'list' });
  const editing = view.name === 'edit' ? models.find((m) => m.id === view.id) : undefined;
  const current: FiguresView = view.name === 'edit' && !editing ? { name: 'list' } : view;
  return {
    view: current,
    editing,
    toList: () => setView({ name: 'list' }),
    toAdd: () => setView({ name: 'add' }),
    toEdit: (m: CustomModel) => setView({ name: 'edit', id: m.id }),
    close: () => { setView({ name: 'list' }); onClose(); },
  };
}
