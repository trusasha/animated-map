import { existsSync, globSync, readFileSync } from 'node:fs';

const LIMIT = 200;
type Entry = { path: string; max: number; reason: string };

const allow: Entry[] = JSON.parse(readFileSync('scripts/size-allowlist.json', 'utf8'));
const lines = (f: string) => readFileSync(f, 'utf8').split('\n').length - (readFileSync(f, 'utf8').endsWith('\n') ? 1 : 0);
const files = [...globSync('src/**/*.{ts,tsx,css}'), ...globSync('server/**/*.ts')].sort();

const errors: string[] = [];
for (const f of files) {
  const n = lines(f);
  const entry = allow.find((e) => e.path === f);
  if (!entry && n > LIMIT) errors.push(`${f}: ${n} lines > ${LIMIT}; split it or add an allowlist entry`);
  if (entry && n > entry.max) errors.push(`${f}: ${n} lines exceeds allowlisted max ${entry.max}`);
}
for (const e of allow) {
  if (!existsSync(e.path)) console.log(`reminder: ${e.path} is gone, remove it from scripts/size-allowlist.json`);
  else if (lines(e.path) <= LIMIT) console.log(`reminder: ${e.path} is now ${lines(e.path)} lines, remove it from scripts/size-allowlist.json`);
  else if (lines(e.path) < e.max) console.log(`reminder: ${e.path} shrank to ${lines(e.path)}, lower its max (${e.max})`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`size ok: ${files.length} files`);
