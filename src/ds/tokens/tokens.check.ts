import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

type Vars = Map<string, string>;
type Rgba = [number, number, number, number];

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const declarations = (block: string): Vars =>
  new Map([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const));
const blockAfter = (css: string, selector: RegExp) => {
  const m = selector.exec(css);
  assert.ok(m, `missing block ${selector}`);
  return declarations(m[1]!);
};

const primitive = declarations(read('primitive.css'));
const light = declarations(read('semantic.css'));
const darkCss = read('semantic-dark.css');
const dark = blockAfter(darkCss, /:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
const darkSystem = blockAfter(darkCss, /:is\(\[data-theme="system"\], :not\(\[data-theme\]\)\)\s*\{([^}]*)\}/);

const keys = (v: Vars) => [...v.keys()].filter((k) => k !== '--color-scheme').sort();
assert.deepEqual(keys(dark), keys(light), 'dark keys must match light keys');
assert.deepEqual([...darkSystem], [...dark], 'prefers-color-scheme block must equal [data-theme=dark] block');

const resolver = (...layers: Vars[]) => {
  const all: Vars = new Map(layers.flatMap((l) => [...l]));
  const resolve = (name: string, seen = new Set<string>()): string => {
    assert.ok(!seen.has(name), `var cycle at ${name}`);
    const value = all.get(name);
    assert.ok(value !== undefined, `undefined token ${name}`);
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    return ref ? resolve(ref[1]!, new Set(seen).add(name)) : value;
  };
  for (const [name, value] of all) {
    for (const m of value.matchAll(/var\((--[\w-]+)\)/g)) resolve(m[1]!, new Set([name]));
  }
  return resolve;
};
const themes = { light: resolver(primitive, light), dark: resolver(primitive, light, dark) };

const parse = (value: string): Rgba => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join('') : hex[1]!;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1) as Rgba;
  }
  const rgba = /^rgba?\(([^)]+)\)$/.exec(value);
  assert.ok(rgba, `cannot parse color ${value}`);
  const [r = 0, g = 0, b = 0, a = 1] = rgba[1]!.split(',').map(Number);
  return [r, g, b, a];
};
const over = (fg: Rgba, bg: Rgba): Rgba => [0, 1, 2].map((i) => fg[i]! * fg[3] + bg[i]! * (1 - fg[3])).concat(1) as Rgba;
const luminance = ([r, g, b]: Rgba) => {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!;
};
const ratio = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const BODY = 4.5;
const LARGE = 3;
const pairs: Array<[fg: string, bg: string, min: number]> = [
  ...['--text-primary', '--text-body', '--text-secondary', '--text-muted'].flatMap((fg) =>
    ['--surface-root', '--surface-page', '--surface-card', '--surface-alt', '--surface-selected'].map((bg) => [fg, bg, BODY] as [string, string, number]),
  ),
  ...['--surface-root', '--surface-page', '--surface-card'].map((bg) => ['--text-link', bg, BODY] as [string, string, number]),
  ['--text-link', '--surface-alt', LARGE],
  ['--text-link', '--surface-selected', LARGE],
  ['--accent-active', '--surface-alt', BODY],
  ['--accent-active', '--surface-selected', BODY],
  ['--text-input', '--surface-input', BODY],
  ['--text-secondary', '--surface-hover', BODY],
  ['--text-muted', '--surface-hover', BODY],
  ['--text-warning', '--surface-page', BODY],
  ['--text-warning', '--surface-warning', BODY],
  ['--text-error', '--surface-error', BODY],
  ['--text-success', '--surface-page', BODY],
  ['--text-success', '--surface-success', BODY],
  ['--text-on-accent', '--accent-fill', BODY],
  ['--text-on-dark', '--surface-dark', BODY],
  ['--text-link-on-dark', '--surface-dark', BODY],
  ['--text-on-brand', '--surface-brand-dark', BODY],
  ['--focus', '--surface-page', LARGE],
  ['--accent', '--surface-page', LARGE],
];

const rows: string[] = [];
for (const [theme, resolve] of Object.entries(themes)) {
  const page = parse(resolve('--surface-page'));
  const solid = (token: string) => over(parse(resolve(token)), page);
  for (const [fg, bg, min] of pairs) {
    const back = solid(bg);
    const value = ratio(over(parse(resolve(fg)), back), back);
    rows.push(`${theme.padEnd(5)} ${fg.padEnd(20)} on ${bg.padEnd(22)} ${value.toFixed(2).padStart(5)}  (min ${min})`);
    assert.ok(value >= min, `${theme}: ${fg} on ${bg} = ${value.toFixed(2)} < ${min}`);
  }
}
console.log(rows.join('\n'));

for (const [theme, resolve] of Object.entries(themes)) {
  assert.equal(resolve('--line-orange'), '#dd5b00', `${theme}: data colours must not change`);
  assert.equal(resolve('--surface-frame'), '#e7e3de', `${theme}: frame placeholder must not change`);
}
assert.equal(themes.light('--text-decorative'), '#a39e98', 'mockup grey kept as --text-decorative');
assert.equal(themes.dark('--text-decorative'), '#6a6662', 'mockup grey kept as --text-decorative');
console.log('tokens ok');
