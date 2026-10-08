import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';

const files = [...globSync('src/**/*.check.ts'), ...globSync('scripts/*.check.ts')].sort();
for (const f of files) {
  console.log(`▶ ${f}`);
  execFileSync('npx', ['tsx', f], { stdio: 'inherit' });
}
console.log(`all ${files.length} checks passed`);
