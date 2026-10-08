import assert from 'node:assert/strict';
import { createT, dictionaries } from '.';
import { formatKm, formatMultiplier, formatRelativeTime } from './format';
import type { Leaf, Namespace } from './keys';

type Flat = Map<string, Leaf>;

function flatten(node: Namespace, prefix = '', out: Flat = new Map()): Flat {
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || typeof (v as { other?: unknown }).other === 'string') out.set(path, v as Leaf);
    else flatten(v as Namespace, path, out);
  }
  return out;
}

const forms = (v: Leaf) => (typeof v === 'string' ? { _: v } : (v as Record<string, string>));
const holders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const union = (v: Leaf) => new Set(Object.values(forms(v)).flatMap((s) => [...holders(s)]));

const en = flatten(dictionaries.en), ru = flatten(dictionaries.ru);

for (const k of en.keys()) assert.ok(ru.has(k), `ru is missing ${k}`);
for (const k of ru.keys()) assert.ok(en.has(k), `ru has extra key ${k}`);

for (const ns of Object.keys(dictionaries.en)) {
  assert.ok([...en.keys()].some((k) => k.startsWith(`${ns}.`)), `en namespace ${ns} is empty`);
}

for (const [k, e] of en) {
  const r = ru.get(k)!;
  const ePlural = typeof e !== 'string', rPlural = typeof r !== 'string';
  assert.equal(rPlural, ePlural, `${k}: plural-ness differs between en and ru`);
  for (const [lang, v] of [['en', e], ['ru', r]] as const) {
    for (const [form, s] of Object.entries(forms(v))) assert.ok(s.trim(), `${lang}:${k}.${form} is empty`);
  }
  if (ePlural) {
    for (const f of ['one', 'few', 'many', 'other'] as const) assert.ok((r as Record<string, string>)[f], `ru:${k} lacks plural form ${f}`);
    for (const f of ['one', 'other'] as const) assert.ok((e as Record<string, string>)[f], `en:${k} lacks plural form ${f}`);
    assert.ok((e as Record<string, string>).other.includes('{count}'), `en:${k}.other must use {count}`);
  }
  const want = union(e);
  for (const [form, s] of Object.entries(forms(r))) {
    for (const p of holders(s)) assert.ok(want.has(p), `ru:${k}.${form} uses {${p}} unknown to en`);
  }
  if (!ePlural) assert.deepEqual([...holders(r as string)].sort(), [...want].sort(), `${k}: placeholders differ`);
  else assert.deepEqual([...union(r)].sort(), [...want].sort(), `${k}: placeholders differ`);
}

const tru = createT('ru', dictionaries.ru), ten = createT('en', dictionaries.en);
const stops = (t: typeof tru, count: number) => t('common.stops', { count });
assert.deepEqual([1, 2, 4, 5, 11, 12, 21, 22, 25, 0].map((n) => stops(tru, n)),
  ['1 точка', '2 точки', '4 точки', '5 точек', '11 точек', '12 точек', '21 точка', '22 точки', '25 точек', '0 точек']);
assert.deepEqual([0, 1, 2].map((n) => stops(ten, n)), ['0 stops', '1 stop', '2 stops']);
assert.equal(ten('route.range.set', { from: 2, to: 4 }), 'Video covers stops 2–4. The rest stays editable but is left out.');
assert.equal(tru('home.newTrip'), 'Новое путешествие');
assert.equal(ten('route.pick.banner'), 'Click the map to place {name}');
assert.equal((ten as (k: string) => string)('nope.missing'), 'nope.missing');

const now = Date.parse('2026-10-08T12:00:00Z');
const ago = (ms: number) => new Date(now - ms);
assert.deepEqual([5_000, 5 * 60_000, 3 * 3_600_000, 30 * 3_600_000].map((ms) => formatRelativeTime('ru', tru, ago(ms), now)),
  ['Только что', '5 мин назад', '3 ч назад', 'Вчера']);
assert.equal(formatRelativeTime('en', ten, ago(5 * 60_000), now), '5 min ago');
assert.equal(formatMultiplier(1.5), '×1.5');
assert.equal(formatMultiplier(1), '×1');
assert.match(formatKm('en', 600), /600\s?km/);
assert.match(formatKm('ru', 600), /600\s?км/);

console.log(`i18n ok: ${en.size} keys`);
