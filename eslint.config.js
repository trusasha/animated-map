import js from '@eslint/js';
import globals from 'globals';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import tseslint from 'typescript-eslint';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const BASE_PACKAGES = [
  'maplibre-gl',
  'maplibre-gl/*',
  'three',
  'three/*',
  'mp4-muxer',
  '@base-ui/*',
  'lucide-react',
  'pg',
  '@electric-sql/pglite',
  '@dnd-kit/*',
];
const WEBCODECS = ['VideoEncoder', 'VideoFrame', 'EncodedVideoChunk', 'VideoDecoder'];
const REACT = ['react', 'react/*', 'react-dom', 'react-dom/*'];

const restrictedGlobals = (names) =>
  names.length === 0
    ? 'off'
    : ['error', ...names.map((name) => ({ name, message: `${name} is not allowed in this layer (see CLAUDE.md).` }))];

// esquery regex literals cannot contain '/', hence \x2f
const dynamicImportSelector = (packages) => {
  const matchers = packages.map((p) =>
    p.endsWith('/*') ? `[source.value=/^${p.slice(0, -2).replaceAll('/', '\\x2f')}\\x2f/]` : `[source.value="${p}"]`,
  );
  return `ImportExpression:matches(${matchers.join(', ')})`;
};

const layer = (name) => `**/${name}/**`;

// flat config replaces a rule per matching block, so every block restates the full lists
const restrict = ({ packages = BASE_PACKAGES, groups = [], globals: extraGlobals = [], webcodecs = true } = {}) => ({
  'no-restricted-imports': [
    'error',
    {
      paths: packages.map((name) => ({ name, message: `Import ${name} only through its own service/layer (see CLAUDE.md).` })),
      patterns: [
        { group: packages.filter((p) => p.endsWith('/*')), message: 'Import only through its own service/layer (see CLAUDE.md).' },
        { group: groups, message: 'Forbidden dependency direction (see CLAUDE.md).' },
      ].filter((p) => p.group.length > 0),
    },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: dynamicImportSelector(packages), message: 'Dynamic import of this package is not allowed in this layer (see CLAUDE.md).' },
  ],
  // a severity-only entry would inherit the previous block's options, so an empty list must be 'off'
  'no-restricted-globals': restrictedGlobals([...(webcodecs ? WEBCODECS : []), ...extraGlobals]),
});

const SERVICE_GROUPS = [layer('features'), layer('app'), layer('ds')];

const without = (...names) => BASE_PACKAGES.filter((p) => !names.includes(p));

const dirs = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
};

// resolver-based, so relative imports are caught too; `except` keeps a feature's index.ts public
const boundaryZones = (root) => {
  const forbid = (targets, froms) => targets.flatMap((target) => froms.map((from) => ({ target: `./${target}`, from: `./${from}` })));
  const features = dirs(path.join(root, 'src/features'));
  return [
    ...forbid(['src/domain'], ['src/services', 'src/features', 'src/app', 'src/ds', 'src/i18n']),
    ...forbid(['src/ds'], ['src/domain', 'src/services', 'src/features', 'src/app', 'src/i18n']),
    ...forbid(['src/lib'], ['src/domain', 'src/services', 'src/features', 'src/app', 'src/ds', 'src/i18n']),
    ...forbid(['src/services'], ['src/features', 'src/app', 'src/ds']),
    ...forbid(['src/services/map'], ['src/services/scene3d']),
    ...forbid(['src/services/scene3d'], ['src/services/map']),
    ...forbid(['src/features'], ['src/app']),
    { target: './src/features', from: './src/ds/components', except: ['./index.ts', './index.tsx'] },
    ...forbid(['src/i18n'], ['src/services', 'src/features', 'src/app']),
    ...forbid(['server'], ['src/services', 'src/features']),
    ...features.flatMap((f) =>
      features.filter((g) => g !== f).map((g) => ({
        target: `./src/features/${f}`,
        from: `./src/features/${g}`,
        except: ['./index.ts', './index.tsx'],
      })),
    ),
  ];
};

const buildConfig = (root) => tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'design/**', 'test-results/**', 'playwright-report/**', 'scripts/lint-fixtures/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    plugins: { 'import-x': importX },
    settings: { 'import-x/resolver-next': [createNodeResolver({ extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'] })] },
    rules: { 'import-x/no-restricted-paths': ['error', { basePath: root, zones: boundaryZones(root) }] },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'max-lines': ['warn', { max: 200 }] },
  },
  { files: ['src/**/*.{ts,tsx}'], rules: restrict() },
  {
    files: ['src/services/map/**'],
    rules: restrict({ packages: [...without('maplibre-gl', 'maplibre-gl/*'), ...REACT], groups: [layer('services/scene3d'), ...SERVICE_GROUPS] }),
  },
  {
    files: ['src/services/scene3d/**'],
    rules: restrict({ packages: [...without('three', 'three/*'), ...REACT], groups: [layer('services/map'), ...SERVICE_GROUPS] }),
  },
  {
    files: ['src/services/video/**'],
    rules: restrict({ packages: [...without('mp4-muxer'), ...REACT], groups: SERVICE_GROUPS, webcodecs: false }),
  },
  {
    files: ['src/ds/**'],
    rules: restrict({
      packages: without('@base-ui/*', 'lucide-react', '@dnd-kit/*'),
      groups: [layer('domain'), layer('services'), layer('features'), layer('app'), layer('i18n')],
    }),
  },
  {
    files: ['src/domain/**'],
    rules: restrict({
      packages: [...BASE_PACKAGES, ...REACT],
      groups: [layer('services'), layer('features'), layer('app'), layer('ds'), layer('i18n')],
      globals: ['fetch', 'window', 'document', 'localStorage'],
    }),
  },
  {
    files: ['src/services/**'],
    ignores: ['src/services/map/**', 'src/services/scene3d/**', 'src/services/video/**'],
    rules: restrict({ packages: [...BASE_PACKAGES, ...REACT], groups: SERVICE_GROUPS }),
  },
  {
    files: ['src/features/**'],
    rules: restrict({
      groups: [layer('app'), '**/ds/components/**', '**/features/*/**', '!**/features/*/index'],
    }),
  },
  {
    files: ['src/i18n/**'],
    rules: restrict({ groups: [layer('services'), layer('features'), layer('app')] }),
  },
  {
    files: ['server/**/*.ts'],
    rules: restrict({
      packages: ['three', 'three/*', 'maplibre-gl', 'maplibre-gl/*', 'mp4-muxer', '@base-ui/*', 'lucide-react', 'pg', '@electric-sql/pglite'],
      groups: ['**/src/services/**', '**/src/features/**'],
      webcodecs: false,
    }),
  },
  {
    files: ['server/db/**'],
    rules: restrict({
      packages: ['three', 'three/*', 'maplibre-gl', 'maplibre-gl/*', 'mp4-muxer', '@base-ui/*', 'lucide-react'],
      groups: ['**/src/services/**', '**/src/features/**'],
      webcodecs: false,
    }),
  },
  {
    // Temporary quality debt (as of 2026-10-08): demoted to warnings until the file is rewritten under the new layers
    files: ['server/ai.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
);

export { buildConfig };
export default buildConfig(import.meta.dirname);
