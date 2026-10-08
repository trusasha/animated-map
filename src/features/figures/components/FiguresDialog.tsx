import { Button, Dialog, useViewportMode } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { CustomModel } from '../../../domain/types';
import { useAddFigure } from '../hooks/useAddFigure';
import { useEditFigure } from '../hooks/useEditFigure';
import { useFigureThumbs } from '../hooks/useFigureThumbs';
import { useFiguresDialog } from '../hooks/useFiguresDialog';
import { useModels } from '../hooks/useModels';
import type { FiguresDialogProps } from '../types';
import { AddFigureView } from './AddFigureView';
import { EditFigureView } from './EditFigureView';
import { FiguresList } from './FiguresList';

type Models = ReturnType<typeof useModels>;

function AddFigure({ models, onDone }: { models: Models; onDone: () => void }) {
  const form = useAddFigure(models.add, onDone);
  return (
    <AddFigureView
      fileName={form.file?.name} kind={form.kind} preview={form.preview} photo3d={models.photo3d}
      name={form.name} mode={form.mode} busy={form.busy} error={form.error} canSubmit={form.canSubmit}
      onPick={form.pick} onName={form.setName} onMode={form.setMode} onSubmit={form.submit}
    />
  );
}

function EditFigure({ model, models, onDone }: { model: CustomModel; models: Models; onDone: () => void }) {
  const form = useEditFigure(model, models.edit, onDone);
  const thumb = useFigureThumbs([{ id: `model:${model.url}`, pose: form.pose }]);
  return (
    <EditFigureView
      src={thumb({ id: `model:${model.url}`, pose: form.pose })}
      name={form.name} mode={form.mode} pose={form.pose} busy={form.busy} error={form.error} canSubmit={form.canSubmit}
      onName={form.setName} onMode={form.setMode} onRotate={form.rotate} onScale={form.setScale} onReset={form.reset}
      onSubmit={form.submit} onDelete={() => { models.remove(model); onDone(); }}
    />
  );
}

export function FiguresDialog({ open, onClose }: FiguresDialogProps) {
  const { t } = useT();
  const { mode } = useViewportMode();
  const models = useModels();
  const dialog = useFiguresDialog(models.models, onClose);
  const thumb = useFigureThumbs(models.models.filter((m) => m.url).map((m) => ({ id: `model:${m.url}`, pose: m.pose })));
  const { view } = dialog;
  const title = view.name === 'add' ? t('figures.add.title') : view.name === 'edit' ? t('figures.edit.title') : t('figures.list.title');
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && dialog.close()}
      title={title}
      subtitle={view.name === 'list' ? t('figures.list.subtitle') : undefined}
      width={720}
      fullScreenBelow="phone"
      closeLabel={t('common.aria.close')}
      leading={view.name === 'list' ? undefined : <Button variant="ghost" size="sm" onClick={dialog.toList}>{t('figures.add.back')}</Button>}
      actions={view.name === 'list' ? (
        <Button size="sm" onClick={dialog.toAdd} aria-label={t('figures.list.add')}>
          {t(mode === 'phone' ? 'figures.list.addShort' : 'figures.list.add')}
        </Button>
      ) : undefined}
    >
      {view.name === 'add' && <AddFigure models={models} onDone={dialog.toList} />}
      {view.name === 'edit' && dialog.editing && <EditFigure key={view.id} model={dialog.editing} models={models} onDone={dialog.toList} />}
      {view.name === 'list' && (
        <FiguresList models={models.models} thumb={(m) => (m.url ? thumb({ id: `model:${m.url}`, pose: m.pose }) : undefined)} onEdit={dialog.toEdit} onDelete={models.remove} />
      )}
    </Dialog>
  );
}
