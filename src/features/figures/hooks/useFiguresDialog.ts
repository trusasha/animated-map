import { useState } from 'react';
import type { CustomModel } from '../../../domain/types';

export type FiguresView = { name: 'list' } | { name: 'add' } | { name: 'edit'; id: string } | { name: 'orient'; id: string };

/** which screen of the dialog is shown; resets to the list whenever the dialog closes */
export function useFiguresDialog(models: CustomModel[], onClose: () => void) {
  const [view, setView] = useState<FiguresView>({ name: 'list' });
  const editing = 'id' in view ? models.find((m) => m.id === view.id) : undefined;
  const current: FiguresView = 'id' in view && !editing ? { name: 'list' } : view;
  return {
    view: current,
    editing,
    toList: () => setView({ name: 'list' }),
    toAdd: () => setView({ name: 'add' }),
    toEdit: (m: CustomModel) => setView({ name: 'edit', id: m.id }),
    toOrient: (m: CustomModel) => setView({ name: 'orient', id: m.id }),
    back: () => setView(view.name === 'orient' ? { name: 'edit', id: view.id } : { name: 'list' }),
    close: () => { setView({ name: 'list' }); onClose(); },
  };
}
