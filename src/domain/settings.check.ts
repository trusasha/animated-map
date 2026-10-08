import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
assert.deepEqual(normalizeSettings('x'), DEFAULT_SETTINGS);
assert.deepEqual(normalizeSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
assert.notEqual(normalizeSettings(undefined).figures, DEFAULT_SETTINGS.figures, 'defaults are copied, not shared');

const s = normalizeSettings({
  theme: 'dark', lang: 'en', flyKm: 5000, exportLongSide: 1080, junk: 1,
  figures: { air: 'helicopter', ground: 7 }, colors: { water: '#123456', air: 'red' },
});
assert.equal(s.theme, 'dark');
assert.equal(s.lang, 'en');
assert.equal(s.flyKm, 2000, 'flyKm clamped to the slider range');
assert.equal(normalizeSettings({ flyKm: 3 }).flyKm, 100);
assert.equal(normalizeSettings({ flyKm: NaN }).flyKm, 600);
assert.equal(s.exportLongSide, 1080);
assert.ok(!('junk' in s));
assert.deepEqual(s.figures, { air: 'helicopter', ground: 'car', water: 'ship' }, 'invalid figure falls back per mode');
assert.deepEqual(s.colors, { air: '#0075de', ground: '#dd5b00', water: '#123456' }, 'invalid colour falls back per mode');
assert.equal(normalizeSettings({ theme: 'neon', lang: 'de', exportLongSide: 720 }).exportLongSide, 1920);
assert.equal(normalizeSettings({ theme: 'neon' }).theme, 'system');

console.log('settings ok');
