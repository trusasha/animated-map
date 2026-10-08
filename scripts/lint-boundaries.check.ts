import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ESLint } from 'eslint';
// @ts-expect-error eslint.config.js is untyped JS
import { buildConfig } from '../eslint.config.js';

const FIXTURES = 'scripts/lint-fixtures';
const PATHS = 'import-x/no-restricted-paths';

// resolver-based rules need real targets, so the fixtures are linted inside a throwaway tree
const STUBS = [
  'src/domain/route.ts',
  'src/services/map/index.ts',
  'src/services/scene3d/scene.ts',
  'src/features/route/index.ts',
  'src/features/route/hooks/x.ts',
  'src/features/trips/index.ts',
  'src/ds/components/Button.tsx',
];

const cases: { fixture: string; virtualPath: string; rule: string | null }[] = [
  { fixture: 'domain-imports-react.ts', virtualPath: 'src/domain/fixture.ts', rule: 'no-restricted-imports' },
  { fixture: 'domain-imports-services.ts', virtualPath: 'src/domain/fixture.ts', rule: PATHS },
  { fixture: 'features-imports-maplibre.tsx', virtualPath: 'src/features/trips/fixture.tsx', rule: 'no-restricted-imports' },
  { fixture: 'ds-imports-domain.tsx', virtualPath: 'src/ds/fixture.tsx', rule: PATHS },
  { fixture: 'server-imports-pglite-outside-db.ts', virtualPath: 'server/routes/fixture.ts', rule: 'no-restricted-imports' },
  { fixture: 'map-imports-react.ts', virtualPath: 'src/services/map/fixture.ts', rule: 'no-restricted-imports' },
  { fixture: 'map-imports-scene3d.ts', virtualPath: 'src/services/map/fixture.ts', rule: PATHS },
  { fixture: 'video-global-outside-video.ts', virtualPath: 'src/features/export/fixture.ts', rule: 'no-restricted-globals' },
  { fixture: 'features-deep-ds-import.tsx', virtualPath: 'src/features/trips/fixture.tsx', rule: PATHS },
  { fixture: 'features-deep-feature-import.tsx', virtualPath: 'src/features/trips/fixture.tsx', rule: PATHS },
  { fixture: 'features-dynamic-import-three.ts', virtualPath: 'src/features/trips/fixture.ts', rule: 'no-restricted-syntax' },
  { fixture: 'server-dynamic-import-pglite.ts', virtualPath: 'server/routes/fixture.ts', rule: 'no-restricted-syntax' },
  // the same code is legal in the layer that owns it
  { fixture: 'features-imports-feature-index.tsx', virtualPath: 'src/features/trips/fixture.tsx', rule: null },
  { fixture: 'video-global-outside-video.ts', virtualPath: 'src/services/video/fixture.ts', rule: null },
  { fixture: 'server-imports-pglite-outside-db.ts', virtualPath: 'server/db/fixture.ts', rule: null },
  { fixture: 'server-dynamic-import-pglite.ts', virtualPath: 'server/db/fixture.ts', rule: null },
];

// realpath: the resolver returns real paths and tmpdir() is a symlink on macOS
const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'lint-boundaries-')));
try {
  for (const stub of STUBS) {
    mkdirSync(path.dirname(path.join(root, stub)), { recursive: true });
    writeFileSync(path.join(root, stub), 'export {};\n');
  }
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, baseConfig: buildConfig(root) });

  for (const { fixture, virtualPath, rule } of cases) {
    const code = readFileSync(`${FIXTURES}/${fixture}`, 'utf8');
    const [result] = await eslint.lintText(code, { filePath: path.join(root, virtualPath) });
    assert.equal(result.fatalErrorCount, 0, `${fixture} as ${virtualPath}: fatal parse error: ${result.messages.map((m) => m.message).join('; ')}`);
    const ids = result.messages.filter((m) => m.ruleId?.includes('no-restricted-')).map((m) => m.ruleId);
    if (rule) assert.ok(ids.includes(rule), `${fixture} as ${virtualPath}: expected ${rule}, got [${ids.join(', ')}]`);
    else assert.deepEqual(ids, [], `${fixture} as ${virtualPath}: expected clean, got [${ids.join(', ')}]`);
    console.log(`ok ${fixture} @ ${virtualPath} -> ${rule ?? 'clean'}`);
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
