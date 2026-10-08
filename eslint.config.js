import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
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
];
const WEBCODECS = ['VideoEncoder', 'VideoFrame', 'EncodedVideoChunk', 'VideoDecoder'];
const REACT = ['react', 'react/*', 'react-dom', 'react-dom/*'];

const restrictedGlobals = (names) =>
  names.length === 0
    ? 'off'
    : ['error', ...names.map((name) => ({ name, message: `${name} is not allowed in this layer (see CLAUDE.md).` }))];

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
  // a severity-only entry would inherit the previous block's options, so an empty list must be 'off'
  'no-restricted-globals': restrictedGlobals([...(webcodecs ? WEBCODECS : []), ...extraGlobals]),
});

const without = (...names) => BASE_PACKAGES.filter((p) => !names.includes(p));

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'design/**', 'test-results/**', 'playwright-report/**', 'scripts/lint-fixtures/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'max-lines': ['warn', { max: 200 }] },
  },
  { files: ['src/**/*.{ts,tsx}'], rules: restrict() },
  {
    files: ['src/services/map/**'],
    rules: restrict({ packages: without('maplibre-gl', 'maplibre-gl/*'), groups: [layer('services/scene3d')] }),
  },
  {
    files: ['src/services/scene3d/**'],
    rules: restrict({ packages: without('three', 'three/*'), groups: [layer('services/map')] }),
  },
  {
    files: ['src/services/video/**'],
    rules: restrict({ packages: without('mp4-muxer'), webcodecs: false }),
  },
  {
    files: ['src/ds/**'],
    rules: restrict({
      packages: without('@base-ui/*', 'lucide-react'),
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
    ignores: ['src/services/map/**', 'src/services/scene3d/**', 'src/services/video/**', 'src/services/routing/**'],
    rules: restrict({ packages: [...BASE_PACKAGES, ...REACT], groups: [layer('features'), layer('app'), layer('ds')] }),
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
    // Temporary legacy exceptions (added 2026-10-08): remove an entry when its file is deleted or split
    files: [
      'src/App.tsx',
      'src/legacy/**',
      'src/animator.ts',
      'src/exporter.ts',
      'src/figures.ts',
      'src/thumbs.ts',
      'src/figures-gallery.ts',
      'src/ukiyoe.ts',
      'src/main.tsx',
      'server/db.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
      'react-hooks/refs': 'off', // legacy App.tsx assigns refs during render
    },
  },
  {
    // Temporary legacy quality debt (added 2026-10-08): demoted to warnings until each file is rewritten under the new layers
    files: ['src/*.{ts,tsx}', 'server/*.ts'],
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
