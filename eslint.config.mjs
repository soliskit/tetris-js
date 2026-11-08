import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import promise from 'eslint-plugin-promise';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  { ignores: ['node_modules/', 'reports/', 'docs/audit/evidence/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  promise.configs['flat/recommended'],
  prettierRecommended,
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
