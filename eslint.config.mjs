import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { createRequire } from 'node:module';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

// eslint-plugin-promise ships no type declarations, so it is loaded as an
// unknown value and checked at runtime instead of being declared or cast.
/** @type {unknown} */
const promisePlugin = createRequire(import.meta.url)('eslint-plugin-promise');
/** @type {unknown} */
const promiseConfigs =
  typeof promisePlugin === 'object' && promisePlugin !== null
    ? Reflect.get(promisePlugin, 'configs')
    : undefined;
/** @type {unknown} */
const promiseRecommended =
  typeof promiseConfigs === 'object' && promiseConfigs !== null
    ? Reflect.get(promiseConfigs, 'flat/recommended')
    : undefined;
if (typeof promiseRecommended !== 'object' || promiseRecommended === null)
  throw new Error('eslint-plugin-promise flat/recommended config is missing');

const TYPED_TEST_FILES = [
  'test/**/*.js',
  'e2e/**/*.js',
  'scripts/**/*.{js,cjs}',
  'playwright.config.js',
  'eslint.config.mjs'
];

export default defineConfig(
  { ignores: ['node_modules/', 'reports/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  promiseRecommended,
  prettierRecommended,
  {
    // tsconfig.json covers public/game/** and public/script.js with checkJs,
    // so the project service can type them.
    files: ['public/game/**/*.js', 'public/script.js'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked
    ].map((config) => ({
      ...config,
      files: ['public/game/**/*.js', 'public/script.js']
    })),
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true }
    }
  },
  {
    // public/sw.js is only in the non-standard tsconfig.sw.json, which the
    // project service does not discover; it needs the same explicit project
    // treatment as any non-standard tsconfig.
    files: ['public/sw.js'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked
    ].map((config) => ({ ...config, files: ['public/sw.js'] })),
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        project: ['./tsconfig.sw.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    // JS files no tsconfig covers get untyped rules only. Scoped by directory
    // on purpose: a broad '**/*.js' block here would override the typed
    // blocks above, because in flat config later blocks win.
    files: [
      'index.js',
      'e2e/**/*.js',
      'scripts/**/*.js',
      'test/**/*.js',
      'playwright.config.js',
      '*.mjs',
      '**/*.cjs'
    ],
    extends: [tseslint.configs.disableTypeChecked].map((config) => ({
      ...config,
      files: [
        'index.js',
        'e2e/**/*.js',
        'scripts/**/*.js',
        'test/**/*.js',
        'playwright.config.js',
        '*.mjs',
        '**/*.cjs'
      ]
    }))
  },
  {
    // Test files that pass the typed rules. They use tsconfig.tests.json,
    // which loads Node's types without changing the app's tsconfig.json.
    // Add a file here only when it passes; the rest stay in the block above.
    files: TYPED_TEST_FILES,
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked
    ].map((config) => ({ ...config, files: TYPED_TEST_FILES })),
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.tests.json'],
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    languageOptions: {
      globals: { ...globals.node }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    }
  },
  {
    files: ['public/**/*.js', 'e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.browser }
    }
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  },
  {
    // public/ (game code) and docs/audit/ (evidence records) are excluded from
    // formatting enforcement only; every other rule still applies there.
    files: ['public/**', 'docs/audit/**'],
    rules: { 'prettier/prettier': 'off' }
  }
);
