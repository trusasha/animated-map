import type { CustomModel } from '../../../domain/types';
import { api } from '../../../services/api';
import { setModelPoses } from '../../../services/scene3d';
import { reportError } from '../../toasts';

export interface ModelsState { models: CustomModel[]; loaded: boolean; photo3d: boolean }

const POLL_MS = 5000;
const listeners = new Set<() => void>();
const hidden = new Map<string, { model: CustomModel; index: number; timer: number }>();
let state: ModelsState = { models: [], loaded: false, photo3d: false };
let loading = false;
let poll: number | undefined;

export const getModelsState = () => state;
export const subscribeModels = (l: () => void) => { listeners.add(l); return () => void listeners.delete(l); };

const isPending = (m: CustomModel) => m.status.startsWith('pending');

function refreshPending() {
  for (const m of state.models.filter(isPending)) api.refreshModel(m.id).then(putModel).catch(reportError);
}

function set(next: Partial<ModelsState>) {
  state = { ...state, ...next };
  if (next.models) {
    setModelPoses(state.models);
    if (state.models.some(isPending)) poll ??= window.setInterval(refreshPending, POLL_MS);
    else if (poll !== undefined) { window.clearInterval(poll); poll = undefined; }
  }
  listeners.forEach((l) => l());
}

export function loadModels() {
  if (state.loaded || loading) return;
  loading = true;
  Promise.all([api.models(), api.config()])
    .then(([models, config]) => set({ models, photo3d: config.photo3d, loaded: true }))
    .catch(reportError)
    .finally(() => { loading = false; });
}

/** adds a model at the top or replaces the one with the same id; ignores models being deleted */
export function putModel(m: CustomModel) {
  if (hidden.has(m.id)) return;
  const known = state.models.some((x) => x.id === m.id);
  set({ models: known ? state.models.map((x) => (x.id === m.id ? m : x)) : [m, ...state.models] });
}

function restore(id: string) {
  const h = hidden.get(id);
  if (!h) return;
  hidden.delete(id);
  const models = [...state.models];
  models.splice(Math.min(h.index, models.length), 0, h.model);
  set({ models });
}

/** removes the model from the list now and from the server after `delayMs`, unless `undoDelete` runs first */
export function deleteLater(model: CustomModel, delayMs: number, onDeleted: (m: CustomModel) => void) {
  const index = state.models.findIndex((m) => m.id === model.id);
  if (index < 0 || hidden.has(model.id)) return;
  const timer = window.setTimeout(() => {
    api.deleteModel(model.id)
      .then(() => { hidden.delete(model.id); onDeleted(model); })
      .catch((e) => { restore(model.id); reportError(e); });
  }, delayMs);
  hidden.set(model.id, { model, index, timer });
  set({ models: state.models.filter((m) => m.id !== model.id) });
}

export function undoDelete(id: string) {
  const h = hidden.get(id);
  if (!h) return;
  window.clearTimeout(h.timer);
  restore(id);
}
