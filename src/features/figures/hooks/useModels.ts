import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { CustomModel, Mode } from '../../../domain/types';
import { poseKey, settingsWithoutModel } from '../../../domain/figures';
import { useT } from '../../../i18n/react';
import { api } from '../../../services/api';
import { useSettings } from '../../settings';
import { useToasts } from '../../toasts';
import { deleteLater, getModelsState, loadModels, putModel, subscribeModels, undoDelete } from './modelsStore';

const UNDO_MS = 6000;

/** the user's figures, shared by every caller; keeps scene3d poses in sync with the list */
export function useModels() {
  const { models, loaded, photo3d } = useSyncExternalStore(subscribeModels, getModelsState);
  const { settings, update } = useSettings();
  const { push } = useToasts();
  const { t } = useT();
  const settingsRef = useRef(settings);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(loadModels, []);

  const add = useCallback(async (file: File, name: string, mode: Mode | null) => {
    const model = await api.addModel(file, name, mode);
    putModel(model);
    if (model.status !== 'ready') push({ tone: 'info', message: t('toasts.figureGenerating', { name: model.name }) });
    return model;
  }, [push, t]);

  const edit = useCallback(async (model: CustomModel) => {
    const saved = await api.editModel(model);
    putModel(saved);
    push({ tone: 'info', message: t('toasts.figureUpdated') });
    return saved;
  }, [push, t]);

  const remove = useCallback((model: CustomModel) => {
    deleteLater(model, UNDO_MS, (gone) => {
      const next = gone.url ? settingsWithoutModel(settingsRef.current, gone.url) : settingsRef.current;
      if (next !== settingsRef.current) update({ figures: next.figures });
    });
    push({ tone: 'info', message: t('figures.list.undoDelete', { name: model.name }), action: { label: t('common.actions.undo'), onAction: () => undoDelete(model.id) } });
  }, [push, t, update]);

  return { models, loaded, photo3d, poseKey: poseKey(models), add, edit, remove };
}
