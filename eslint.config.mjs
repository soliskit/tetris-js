import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import promise from 'eslint-plugin-promise';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

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
    },
    rules: {
      // Scores and flags are interpolated deliberately; keep the rest of the
      // rule's type checking.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true }
      ]
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
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true }
      ]
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
