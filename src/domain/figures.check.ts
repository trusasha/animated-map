import assert from 'node:assert/strict';
import { figureOptions, FIGURES, fittingModels, modelStatus, poseKey, resolveFigures, settingsWithoutModel } from './figures';
import { DEFAULT_SETTINGS } from './settings';
import type { CustomModel, Stop, TripData } from './types';

const M = (id: string, over: Partial<CustomModel> = {}): CustomModel =>
  ({ id, name: id, url: `/u/${id}.glb`, status: 'ready', task_id: null, mode: null, pose: null, ...over });
const models = [M('any'), M('car', { mode: 'ground' }), M('wait', { status: 'pending: генерация' }), M('bad', { status: 'failed', url: null })];

assert.deepEqual(fittingModels(models, 'ground').map((m) => m.id), ['any', 'car']);
assert.deepEqual(fittingModels(models, 'air').map((m) => m.id), ['any']);
assert.deepEqual(figureOptions('water', models).map((o) => o.id), [...FIGURES.water, 'model:/u/any.glb'], 'built-ins first, then own');
assert.deepEqual(modelStatus('ready'), { kind: 'ready' });
assert.deepEqual(modelStatus('failed'), { kind: 'failed' });
assert.deepEqual(modelStatus('pending: в очереди'), { kind: 'pending', detail: 'в очереди' });
assert.deepEqual(modelStatus('pending'), { kind: 'pending', detail: undefined });

const k = poseKey(models);
assert.equal(poseKey(models), k, 'stable');
assert.notEqual(poseKey([M('any', { pose: { rx: 0, ry: 90, rz: 0, scale: 1 } }), models[1]]), k, 'pose changes the key');
assert.notEqual(poseKey(models.slice(1)), k, 'removing a model changes the key');
assert.equal(poseKey([models[2], models[3]]), '', 'models that are not ready do not count');

const leg = (mode: 'air' | 'ground' | 'water', figure: string) => ({ mode, figure });
const stop = (id: string, l?: ReturnType<typeof leg>): Stop => ({ id, name: id, lng: 0, lat: 0, leg: l });
const trip = (...legs: ReturnType<typeof leg>[]): TripData =>
  ({ stops: [stop('a'), ...legs.map((l, i) => stop(`s${i}`, l))], style: 'streets', speed: 1, format: '9:16' });
const intact = trip(leg('air', 'airplane'), leg('ground', 'model:/u/any.glb'));
assert.equal(resolveFigures(intact, models), intact, 'nothing to fix keeps identity');
const healed = resolveFigures(trip(leg('ground', 'model:/u/gone.glb'), leg('water', 'model:/u/gone.glb')), models);
assert.deepEqual(healed.stops.slice(1).map((s) => s.leg!.figure), ['car', 'ship'], 'falls back to the mode defaults');
const own = { ...DEFAULT_SETTINGS, figures: { ...DEFAULT_SETTINGS.figures, ground: 'model:/u/car.glb' } };
assert.equal(resolveFigures(trip(leg('ground', 'model:/u/gone.glb')), models, own).stops[1].leg!.figure, 'model:/u/car.glb', 'settings default wins when it exists');
assert.equal(resolveFigures(trip(leg('ground', 'model:/u/gone.glb')), models.slice(2), own).stops[1].leg!.figure, 'car', 'a missing settings default falls back to the built-in');

assert.equal(settingsWithoutModel(own, '/u/other.glb'), own);
assert.deepEqual(settingsWithoutModel(own, '/u/car.glb').figures, DEFAULT_SETTINGS.figures, 'default reset to the first built-in');

console.log('figures ok');
