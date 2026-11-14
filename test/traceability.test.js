// Requirements traceability: every requirement in docs/requirements.md is
// verified by at least one test, and every test names the requirements it
// verifies, all of which must exist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonArray, jsonObject, jsonString, parseJsonObject } from './json.js';
import { extractTestTitles } from '../scripts/test-title-traceability.js';

const root = fileURLToPath(new URL('../', import.meta.url));

/** @param {string} file */
function readJson(file) {
  return parseJsonObject(fs.readFileSync(path.join(root, file), 'utf8'));
}
const requirementIds = [
  ...fs
    .readFileSync(path.join(root, 'docs', 'requirements.md'), 'utf8')
    .matchAll(/^\| ([A-Z]{2,3}-\d+) \|/gm)
].map((match) => match[1]);

// Every test() call in the unit, browser and delivery test files, with its tags.
const tests = ['test', 'e2e', 'delivery-e2e', 'delivery-checks'].flatMap(
  (folder) =>
    fs
      .readdirSync(path.join(root, folder))
      .filter((file) => file.endsWith('.js'))
      .flatMap((file) =>
        extractTestTitles(
          fs.readFileSync(path.join(root, folder, file), 'utf8'),
          `${folder}/${file}`
        )
      )
);

void test('requirements have unique IDs [QA-1]', () => {
  assert.ok(requirementIds.length >= 40);
  assert.equal(new Set(requirementIds).size, requirementIds.length);
});

void test('every test names at least one requirement [QA-1]', () => {
  assert.ok(tests.length > 100);
  const untagged = tests
    .filter((t) => t.tags.length === 0)
    .map((t) => `${t.where}: ${t.line}`);
  assert.deepEqual(untagged, []);
});

void test('every requirement a test names exists [QA-1]', () => {
  const unknown = tests.flatMap((t) =>
    t.tags
      .filter((tag) => !requirementIds.includes(tag))
      .map((tag) => `${tag} in ${t.where}`)
  );
  assert.deepEqual(unknown, []);
});

void test('every requirement is verified by at least one test [QA-1]', () => {
  const tagged = new Set(tests.flatMap((t) => t.tags));
  assert.deepEqual(
    requirementIds.filter((id) => !tagged.has(id)),
    []
  );
});

void test('npm test enforces 100% line, branch and function coverage of the game logic [QA-2]', () => {
  const script = jsonString(jsonObject(readJson('package.json').scripts).test);
  for (const flag of [
    '--experimental-test-coverage',
    '--test-coverage-include="public/game/**"',
    '--test-coverage-lines=100',
    '--test-coverage-branches=100',
    '--test-coverage-functions=100'
  ]) {
    assert.ok(script.includes(flag), flag);
  }
});

void test('npm run test:e2e enforces 100% browser coverage of the page script [QA-3]', () => {
  const pkg = readJson('package.json');
  assert.ok(
    jsonString(jsonObject(pkg.scripts)['test:e2e']).endsWith(
      '&& node scripts/browser-coverage.js'
    )
  );
  const script = fs.readFileSync(
    path.join(root, 'scripts/browser-coverage.js'),
    'utf8'
  );
  assert.match(script, /export const THRESHOLD = 100;/);
  assert.match(script, /\['lines', 'branches', 'functions'\]/);
});

void test('the browser tests run in WebKit at iPhone size [QA-4]', () => {
  const config = fs.readFileSync(
    path.join(root, 'playwright.config.js'),
    'utf8'
  );
  assert.match(
    config,
    /browserName: 'webkit', viewport: \{ width: 430, height: 932 \}/
  );
  const workflow = fs.readFileSync(
    path.join(root, '.github/workflows/pages.yml'),
    'utf8'
  );
  const lock = readJson('package-lock.json');
  const playwrightVersion = jsonString(
    jsonObject(jsonObject(lock.packages)['node_modules/playwright']).version
  );
  assert.ok(
    workflow.includes('run: npx playwright install --with-deps chromium webkit')
  );
  assert.ok(
    workflow.includes(
      `require('playwright/package.json').version==='${playwrightVersion}'`
    )
  );
  for (const configName of [
    'playwright.config.js',
    'playwright.delivery.config.js'
  ]) {
    assert.ok(
      workflow.includes(
        `node node_modules/playwright/cli.js test --config ${configName} --reporter=list,.github/offline-current/qualification-reporter.mjs --output test-results/`
      )
    );
  }
  assert.ok(workflow.includes('run: node scripts/browser-coverage.js'));
  assert.ok(
    workflow.includes(
      'run: python3 .github/offline-current/validate-reports.py'
    )
  );
});

void test('the code the browser loads is type checked in strict mode, in CI [QA-5]', () => {
  const config = readJson('tsconfig.json');
  for (const option of [
    'checkJs',
    'strict',
    'noImplicitReturns',
    'noUnusedLocals',
    'exactOptionalPropertyTypes'
  ]) {
    assert.equal(jsonObject(config.compilerOptions)[option], true, option);
  }
  assert.deepEqual(config.include, ['public/game/**/*.js', 'public/script.js']);
  assert.deepEqual(readJson('tsconfig.sw.json').include, ['public/sw.js']);
  const generated = readJson('tsconfig.generated-sw.json');
  assert.equal(jsonString(generated.extends), './tsconfig.sw.json');
  assert.deepEqual(jsonArray(generated.include).map(jsonString), [
    'dist/sw.js'
  ]);
  const pkg = readJson('package.json');
  assert.equal(
    jsonObject(pkg.scripts).typecheck,
    'tsc -p tsconfig.json && tsc -p tsconfig.sw.json && tsc -p tsconfig.generated-sw.json'
  );
  assert.match(
    fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8'),
    /npm run typecheck/
  );
});

void test('mutation testing must leave no mutant alive, and runs weekly and on pull requests in CI [QA-6]', () => {
  const config = readJson('stryker.config.json');
  assert.deepEqual(config.mutate, ['public/game/**/*.js']);
  assert.equal(jsonObject(config.thresholds).break, 100);
  const command = jsonString(jsonObject(config.commandRunner).command);
  assert.match(command, /^exec node --test --test-isolation=none /);
  const pkg = readJson('package.json');
  assert.equal(jsonObject(pkg.scripts)['test:mutation'], 'stryker run');
  const workflow = fs.readFileSync(
    path.join(root, '.github/workflows/mutation.yml'),
    'utf8'
  );
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /npm run test:mutation/);
  // Every pull request: a plan job classifies each changed path against
  // the positive critical definition; the matrix runs in parallel per
  // game file when a critical path matches, paths outside the definition
  // are listed in the check summary instead of triggering, and one
  // aggregate check stands for the whole matrix so the merge rule can
  // require it (D85).
  const pullRequests = fs.readFileSync(
    path.join(root, '.github/workflows/mutation-pr.yml'),
    'utf8'
  );
  assert.match(pullRequests, /pull_request:/);
  assert.match(
    pullRequests,
    /on:\n {2}pull_request:\n {4}types: \[opened, synchronize, reopened, ready_for_review\]/,
    'an opened, synchronized, reopened or ready-for-review pull request runs the workflow, whatever it changes'
  );
  for (const arm of [
    'public/*|index.js',
    'test/*|e2e/*|delivery-e2e/*|delivery-checks/*',
    'scripts/*',
    'docs/requirements.md',
    'docs/sources/2-srs_table.txt',
    '.github/*',
    'package.json|package-lock.json',
    'stryker.config.json|playwright.config.js|playwright.delivery.config.js',
    'tsconfig.json|tsconfig.tests.json|tsconfig.sw.json|tsconfig.generated-sw.json',
    'eslint.config.mjs|.prettierrc.json|.prettierignore|ruff.toml|lefthook.yml|.gitignore'
  ])
    assert.ok(
      pullRequests.includes(arm),
      `the critical definition names ${arm}`
    );
  assert.match(
    pullRequests,
    /fromJSON\(needs\.plan\.outputs\.files\)/,
    'one run per game file'
  );
  assert.match(
    pullRequests,
    /npx stryker run --mutate "\$\{\{ matrix\.file \}\}"/,
    'each run mutates its file'
  );
  assert.match(
    pullRequests,
    /git diff --raw -z -M/,
    'the changed paths are classified with rename detection, NUL-safe'
  );
  assert.match(
    pullRequests,
    /git ls-tree -r -z --name-only "\$head_sha" -- public\/game/,
    'a full sweep lists the game files from the head tree, NUL-safe'
  );
  assert.match(
    pullRequests,
    /if: needs\.plan\.outputs\.verdict == 'full'/,
    'the matrix runs only on a full verdict'
  );
  assert.match(
    pullRequests,
    /name: mutation \(all\)/,
    'one aggregate check stands for every run'
  );
  assert.match(
    pullRequests,
    /if: always\(\)/,
    'the aggregate check runs however the runs ended'
  );
  assert.match(
    pullRequests,
    /positive definition of the critical surface/,
    'the workflow documents its positive critical definition'
  );
  assert.match(
    pullRequests,
    /does not trigger mutation/,
    'the workflow documents that unmatched paths do not trigger mutation'
  );
  assert.match(
    pullRequests,
    /check summary/,
    'the workflow documents that unmatched paths are listed in the check summary'
  );
  // Every unit test file that exercises the game logic takes part.
  for (const file of fs
    .readdirSync(path.join(root, 'test'))
    .filter((name) => name.endsWith('.test.js'))) {
    const source = fs.readFileSync(path.join(root, 'test', file), 'utf8');
    if (/^import .* from '\.\.\/public\/game\//m.test(source))
      assert.ok(command.includes(`test/${file}`), file);
  }
});
