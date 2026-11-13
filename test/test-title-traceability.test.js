import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTestTitles } from '../scripts/test-title-traceability.js';

void test('test-title extraction keeps multiline title tags and excludes callback tags [QA-1]', () => {
  const source =
    "test(\n'usable controls ' +\nscope +\n' [APP-2] [DSP-3]', async () => { const decoy = '[APP-99]'; });";
  const titles = extractTestTitles(source, 'fixture.js');
  assert.equal(titles.length, 1);
  assert.deepEqual(titles[0].tags, ['APP-2', 'DSP-3']);
});

void test('test-title extraction does not credit body or comment tags to an untagged title [QA-1]', () => {
  const source =
    "// test('fake [APP-2]', () => {});\ntest(\n'untagged',\n() => { const decoy = '[APP-2]'; });";
  const titles = extractTestTitles(source, 'fixture.js');
  assert.equal(titles.length, 1);
  assert.deepEqual(titles[0].tags, []);
});

void test('test-title extraction keeps unknown title tags for the existing rejection gate [QA-1]', () => {
  assert.deepEqual(
    extractTestTitles("test('unknown [APP-999]', () => {});", 'fixture.js')[0]
      .tags,
    ['APP-999']
  );
});

void test('test-title extraction cannot assemble a requirement tag across a dynamic title segment [QA-1]', () => {
  assert.deepEqual(
    extractTestTitles(
      "test('[APP-' + scope + '2]', () => {});",
      'fixture.js'
    )[0].tags,
    []
  );
});

void test('test-title extraction accepts static template tags and rejects unsupported dynamic calls without evaluating them [QA-1]', () => {
  assert.deepEqual(
    extractTestTitles('test(`static [QA-1]`, () => {});', 'fixture.js')[0].tags,
    ['QA-1']
  );
  assert.throws(
    () => extractTestTitles('test(makeTitle(), () => {});', 'fixture.js'),
    /Unsupported test title expression/
  );
  assert.throws(
    () => extractTestTitles("test('broken [QA-1]", 'fixture.js'),
    /Cannot parse test source/
  );
});
