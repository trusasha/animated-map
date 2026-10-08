import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';

const FIXTURES = 'scripts/lint-fixtures';

const cases: { fixture: string; virtualPath: string; rule: string | null }[] = [
  { fixture: 'domain-imports-react.ts', virtualPath: 'src/domain/fixture.ts', rule: 'no-restricted-imports' },
  { fixture: 'features-imports-maplibre.tsx', virtualPath: 'src/features/trips/fixture.tsx', rule: 'no-restricted-imports' },
  { fixture: 'ds-imports-domain.tsx', virtualPath: 'src/ds/fixture.tsx', rule: 'no-restricted-imports' },
  { fixture: 'server-imports-pglite-outside-db.ts', virtualPath: 'server/routes/fixture.ts', rule: 'no-restricted-imports' },
  { fixture: 'map-imports-scene3d.ts', virtualPath: 'src/services/map/fixture.ts', rule: 'no-restricted-imports' },
  { fixture: 'video-global-outside-video.ts', virtualPath: 'src/features/export/fixture.ts', rule: 'no-restricted-globals' },
  { fixture: 'features-deep-ds-import.tsx', virtualPath: 'src/features/trips/fixture.tsx', rule: 'no-restricted-imports' },
  // the same code is legal in the layer that owns it
  { fixture: 'video-global-outside-video.ts', virtualPath: 'src/services/video/fixture.ts', rule: null },
  { fixture: 'server-imports-pglite-outside-db.ts', virtualPath: 'server/db/fixture.ts', rule: null },
];

const eslint = new ESLint({ cwd: process.cwd() });

for (const { fixture, virtualPath, rule } of cases) {
  const code = readFileSync(`${FIXTURES}/${fixture}`, 'utf8');
  const [result] = await eslint.lintText(code, { filePath: virtualPath });
  const ids = result.messages.filter((m) => m.ruleId?.startsWith('no-restricted-')).map((m) => m.ruleId);
  if (rule) assert.ok(ids.includes(rule), `${fixture} as ${virtualPath}: expected ${rule}, got [${ids.join(', ')}]`);
  else assert.deepEqual(ids, [], `${fixture} as ${virtualPath}: expected clean, got [${ids.join(', ')}]`);
  console.log(`ok ${fixture} @ ${virtualPath} -> ${rule ?? 'clean'}`);
}
