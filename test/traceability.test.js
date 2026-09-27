// Requirements traceability: every requirement in REQUIREMENTS.md is
// verified by at least one test, and every test names the requirements it
// verifies, all of which must exist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const requirementIds = [...fs.readFileSync(path.join(root, 'REQUIREMENTS.md'), 'utf8').matchAll(/^\| ([A-Z]{2,3}-\d+) \|/gm)].map(match => match[1]);

// Every test() call in the unit and browser test files, with its tags.
const tests = ['test', 'e2e'].flatMap(folder =>
  fs.readdirSync(path.join(root, folder))
    .filter(file => file.endsWith('.js'))
    .flatMap(file => fs.readFileSync(path.join(root, folder, file), 'utf8').split('\n')
      .filter(line => /^\s*test\(/.test(line))
      .map(line => ({ where: `${folder}/${file}`, line: line.trim(), tags: [...line.matchAll(/\[([A-Z]{2,3}-\d+)\]/g)].map(match => match[1]) }))));

test('requirements have unique IDs [QA-1]', () => {
  assert.ok(requirementIds.length >= 40);
  assert.equal(new Set(requirementIds).size, requirementIds.length);
});

test('every test names at least one requirement [QA-1]', () => {
  assert.ok(tests.length > 100);
  const untagged = tests.filter(t => t.tags.length === 0).map(t => `${t.where}: ${t.line}`);
  assert.deepEqual(untagged, []);
});

test('every requirement a test names exists [QA-1]', () => {
  const unknown = tests.flatMap(t => t.tags.filter(tag => !requirementIds.includes(tag)).map(tag => `${tag} in ${t.where}`));
  assert.deepEqual(unknown, []);
});

test('every requirement is verified by at least one test [QA-1]', () => {
  const tagged = new Set(tests.flatMap(t => t.tags));
  assert.deepEqual(requirementIds.filter(id => !tagged.has(id)), []);
});

test('npm test enforces 100% line, branch and function coverage of the game logic [QA-2]', () => {
  const script = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts.test;
  for (const flag of ['--experimental-test-coverage', '--test-coverage-include="public/game/**"', '--test-coverage-lines=100', '--test-coverage-branches=100', '--test-coverage-functions=100']) {
    assert.ok(script.includes(flag), flag);
  }
});
