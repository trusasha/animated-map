import { DEFAULT_SETTINGS } from './settings';
import type { CustomModel, Mode, ModelPose, TripData, UserSettings } from './types';

export const FIGURES: Record<Mode, string[]> = {
  air: ['airplane', 'helicopter'],
  ground: ['car', 'motorcycle', 'sportbike', 'bus', 'train', 'bicycle'],
  water: ['ship', 'sailboat'],
};

export type FigureOption = { id: string; model?: CustomModel };
export type ModelStatus = { kind: 'ready' | 'pending' | 'failed'; detail?: string };

const NO_POSE: ModelPose = { rx: 0, ry: 0, rz: 0, scale: 1 };

export const modelFigure = (m: CustomModel) => `model:${m.url}`;
const isUsable = (m: CustomModel): m is CustomModel & { url: string } => m.status === 'ready' && !!m.url;

/** custom models offered for a mode: ready ones, of that mode or of any */
export const fittingModels = (models: CustomModel[], mode: Mode) => models.filter((m) => isUsable(m) && (!m.mode || m.mode === mode));

/** built-ins first, then the user's own */
export const figureOptions = (mode: Mode, models: CustomModel[]): FigureOption[] => [
  ...FIGURES[mode].map((id) => ({ id })),
  ...fittingModels(models, mode).map((model) => ({ id: modelFigure(model), model })),
];

/** server statuses: `ready`, `failed`, `pending: <stage>` */
export function modelStatus(status: string): ModelStatus {
  if (status === 'ready') return { kind: 'ready' };
  if (status === 'failed') return { kind: 'failed' };
  return { kind: 'pending', detail: status.replace(/^pending:?\s*/, '') || undefined };
}

const poseOf = (m: CustomModel) => m.pose ?? NO_POSE;

/** changes whenever a ready model is added, removed or re-posed: the player trip has to be rebuilt then */
export const poseKey = (models: CustomModel[]) =>
  models.filter(isUsable).map((m) => { const p = poseOf(m); return `${m.url}|${p.rx},${p.ry},${p.rz},${p.scale}`; }).join(';');

const exists = (figure: string, mode: Mode, models: CustomModel[]) =>
  figure.startsWith('model:') ? models.some((m) => isUsable(m) && modelFigure(m) === figure) : FIGURES[mode].includes(figure);

/** the default figure for a mode, if the model it points at still exists */
const defaultFigure = (mode: Mode, models: CustomModel[], settings: UserSettings) =>
  exists(settings.figures[mode], mode, models) ? settings.figures[mode] : FIGURES[mode][0];

/** segments whose custom model is gone fall back to the default of their mode (only call with a successfully loaded model list) */
export function resolveFigures(d: TripData, models: CustomModel[], settings: UserSettings = DEFAULT_SETTINGS): TripData {
  const gone = (f: string) => f.startsWith('model:') && !exists(f, 'ground', models);
  if (!d.stops.some((s) => s.leg && gone(s.leg.figure))) return d;
  return { ...d, stops: d.stops.map((s) => (s.leg && gone(s.leg.figure) ? { ...s, leg: { ...s.leg, figure: defaultFigure(s.leg.mode, models, settings) } } : s)) };
}

/** defaults pointing at a deleted model reset to the first built-in of their mode */
export function settingsWithoutModel(settings: UserSettings, url: string): UserSettings {
  const id = `model:${url}`;
  if (!Object.values(settings.figures).includes(id)) return settings;
  const figures = Object.fromEntries(Object.entries(settings.figures).map(([m, f]) => [m, f === id ? FIGURES[m as Mode][0] : f])) as Record<Mode, string>;
  return { ...settings, figures };
}
