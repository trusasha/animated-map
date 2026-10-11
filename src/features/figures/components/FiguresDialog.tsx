import { Button, Dialog, useViewportMode } from '../../../ds';
import { useT } from '../../../i18n/react';
import type { CustomModel } from '../../../domain/types';
import { useAddFigure } from '../hooks/useAddFigure';
import { useEditFigure } from '../hooks/useEditFigure';
import { useFigureThumbs } from '../hooks/useFigureThumbs';
import { useFiguresDialog } from '../hooks/useFiguresDialog';
import { useModelViewer } from '../hooks/useModelViewer';
import { useModels } from '../hooks/useModels';
import { useOrientationEditor } from '../hooks/useOrientationEditor';
import { useOrientationViewer } from '../hooks/useOrientationViewer';
import type { FiguresDialogProps } from '../types';
import { AddFigureView } from './AddFigureView';
import { EditFigureView } from './EditFigureView';
import { FiguresList } from './FiguresList';
import { OrientationView } from './OrientationView';

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

function EditFigure({ model, models, onDone, onOrient }: { model: CustomModel; models: Models; onDone: () => void; onOrient: () => void }) {
  const form = useEditFigure(model, models.edit, onDone);
  const stageRef = useModelViewer(`model:${model.url}`, form.pose);
  return (
    <EditFigureView
      stageRef={stageRef}
      name={form.name} mode={form.mode} pose={form.pose} busy={form.busy} error={form.error} canSubmit={form.canSubmit}
      onName={form.setName} onMode={form.setMode} onScale={form.setScale} onOrient={onOrient}
      onSubmit={form.submit} onDelete={() => { models.remove(model); onDone(); }}
    />
  );
}

function OrientFigure({ model, models, onDone }: { model: CustomModel; models: Models; onDone: () => void }) {
  const form = useOrientationEditor(model, models.edit, onDone);
  const stageRef = useOrientationViewer(model.url!, form.pose, form.rotate);
  return (
    <OrientationView
      stageRef={stageRef} pose={form.pose} revision={form.revision} busy={form.busy} error={form.error} dirty={form.dirty}
      onTurn={form.turn} onAngle={form.setAngle} onReset={form.reset} onCancel={onDone} onSave={form.submit}
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
  const titles = { list: t('figures.list.title'), add: t('figures.add.title'), edit: t('figures.edit.title'), orient: t('figures.orient.title') };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && dialog.close()}
      title={titles[view.name]}
      subtitle={view.name === 'list' ? t('figures.list.subtitle') : undefined}
      width={720}
      fullScreenBelow="phone"
      closeLabel={t('common.aria.close')}
      leading={view.name === 'list' ? undefined : <Button variant="ghost" size="sm" onClick={dialog.back}>{t('figures.add.back')}</Button>}
      actions={view.name === 'list' ? (
        <Button size="sm" onClick={dialog.toAdd} aria-label={t('figures.list.add')}>
          {t(mode === 'phone' ? 'figures.list.addShort' : 'figures.list.add')}
        </Button>
      ) : undefined}
    >
      {view.name === 'add' && <AddFigure models={models} onDone={dialog.toList} />}
      {view.name === 'edit' && dialog.editing && (
        <EditFigure key={view.id} model={dialog.editing} models={models} onDone={dialog.toList} onOrient={() => dialog.toOrient(dialog.editing!)} />
      )}
      {view.name === 'orient' && dialog.editing?.url && (
        <OrientFigure key={view.id} model={dialog.editing} models={models} onDone={dialog.back} />
      )}
      {view.name === 'list' && (
        <FiguresList models={models.models} thumb={(m) => (m.url ? thumb({ id: `model:${m.url}`, pose: m.pose }) : undefined)} onEdit={dialog.toEdit} onDelete={models.remove} />
      )}
    </Dialog>
  );
}
