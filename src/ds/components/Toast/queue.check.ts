import assert from 'node:assert/strict';
import { dismissToast, INFO_TIMEOUT_MS, MAX_TOASTS, pushToast, toastTimeout, type ToastItem } from './queue';

const t = (id: number, tone: ToastItem['tone'] = 'info'): ToastItem => ({ id, tone, message: `m${id}` });

let q: ToastItem[] = [];
for (let i = 1; i <= 4; i++) q = pushToast(q, t(i));
assert.equal(q.length, MAX_TOASTS);
assert.deepEqual(q.map((x) => x.id), [2, 3, 4], '4th toast evicts the oldest');

assert.deepEqual(dismissToast(q, 3).map((x) => x.id), [2, 4]);
assert.deepEqual(dismissToast(q, 99), q, 'unknown id is a no-op');

assert.equal(toastTimeout('info'), INFO_TIMEOUT_MS);
assert.equal(toastTimeout('error'), null, 'errors are sticky');

console.log('toast queue ok');
