// Exercise the actual browser gate in temporary roots, never a game import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../scripts/browser-coverage.js', import.meta.url)
);
const manifest = JSON.parse(
  fs.readFileSync(
    new URL('./fixtures/browser-coverage/cases.json', import.meta.url),
    'utf8'
  )
);
const success =
  'Browser coverage of public/script.js: 100% of lines, branches and functions.';
const messages = {
  missing: 'No browser coverage found.',
  'no-measurement': 'No browser coverage of public/script.js was measured.',
  invalid: 'Invalid browser coverage input',
  'below-threshold': 'is below 100%'
};

for (const item of manifest.cases) {
  test(`browser gate ${item.name} [QA-3]`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tetris-browser-gate-'));
    try {
      fs.mkdirSync(path.join(root, 'public'));
      fs.writeFileSync(path.join(root, 'public/script.js'), manifest.source);
      const input = path.join(root, 'coverage/browser');
      fs.mkdirSync(input, { recursive: true });
      for (const [name, value] of Object.entries(item.files)) {
        assert.match(name, /^[A-Za-z0-9-]+\.json$/);
        fs.writeFileSync(
          path.join(input, name),
          value && !Array.isArray(value) && Object.hasOwn(value, 'RAW')
            ? value.RAW
            : JSON.stringify(value)
        );
      }
      const env = { ...process.env };
      delete env.NODE_OPTIONS;
      delete env.NODE_V8_COVERAGE;
      const result = spawnSync(process.execPath, [script], {
        cwd: root,
        env,
        encoding: 'utf8',
        timeout: 5000,
        maxBuffer: 200000
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null);
      const output = result.stdout + result.stderr;
      if (item.expected === 'success') {
        assert.equal(result.status, 0, output);
        assert.ok(output.includes(success), output);
      } else {
        assert.notEqual(result.status, 0, output);
        assert.ok(!output.includes(success), output);
        if (messages[item.expected])
          assert.ok(output.includes(messages[item.expected]), output);
      }
      if (item.metric_hypothesis) {
        const html = fs.readFileSync(
          path.join(root, 'coverage/browser-report/index.html'),
          'utf8'
        );
        const fractions = [
          ...html.matchAll(/class=['"]fraction['"]>(\d+)\/(\d+)<\/span>/g)
        ].map((match) => [Number(match[1]), Number(match[2])]);
        assert.ok(fractions.length >= 4);
        const actual = Object.fromEntries(
          ['statements', 'branches', 'functions', 'lines'].map((kind, i) => [
            kind,
            fractions[i]
          ])
        );
        for (const [kind, expected] of Object.entries(item.metric_hypothesis))
          assert.deepEqual(actual[kind], [expected.covered, expected.total]);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
