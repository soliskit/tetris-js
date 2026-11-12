import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import promise from 'eslint-plugin-promise';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const TYPED_TEST_FILES = [
  'test/factory.test.js',
  'test/game.test.js',
  'test/model.test.js',
  'test/audit/l1-trace.test.js',
  'test/saveOracle.js',
  'test/semanticSave.test.js',
  'e2e/global-setup.js',
  'playwright.config.js',
  'test/helpers.js',
  'e2e/dialog-selection.spec.js'
];

export default defineConfig(
  { ignores: ['node_modules/', 'reports/', 'docs/audit/evidence/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  promise.configs['flat/recommended'],
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
