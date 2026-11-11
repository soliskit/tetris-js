// Authoring only. These regressions have not been executed for this candidate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync as nativeSpawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const C = require('../scripts/native-coverage-common.cjs');
const { validate } = require('../scripts/native-coverage.cjs');
const supervisor = fileURLToPath(
  new URL('../scripts/native-coverage.cjs', import.meta.url)
);
// Optional diagnostic telemetry preserves actual subrun outcomes separately from
// top-level assertions. When no telemetry directory is configured, no telemetry
// path is used.
let telemetrySequence = 0;
function subrunTelemetry(record) {
  const directory = process.env.TETRIS_QA2_CASE_TELEMETRY;
  if (!directory) return;
  const filename = path.join(
    directory,
    String(telemetrySequence++).padStart(6, '0') + '.json'
  );
  fs.writeFileSync(filename, JSON.stringify(record) + '\n', {
    flag: 'wx',
    mode: 0o600
  });
}
// Standalone fixture CLIs are not recursive node:test API calls. Remove only
// the inherited native child marker here, never in the product supervisor or
// the user's command. Capture its before/after state for interpretation.
function fixtureEnvironment(original = process.env) {
  const env = { ...original };
  delete env.NODE_TEST_CONTEXT;
  return env;
}
function environmentEvidence(env) {
  return {
    NODE_TEST_CONTEXT: Object.hasOwn(env, 'NODE_TEST_CONTEXT')
      ? env.NODE_TEST_CONTEXT
      : null,
    NODE_OPTIONS: env.NODE_OPTIONS ?? null,
    NODE_V8_COVERAGE: env.NODE_V8_COVERAGE ?? null,
    TMPDIR: env.TMPDIR ?? null
  };
}
function spawnSync(executable, argv, options, allowRecursiveWarning = false) {
  const inherited = options.env ?? process.env;
  const standalone = fixtureEnvironment(inherited);
  const directory = process.env.TETRIS_QA2_CASE_TELEMETRY;
  const isSupervisor = argv[0] === supervisor;
  const statusPath =
    directory && isSupervisor
      ? path.join(directory, 'native-status-' + telemetrySequence + '.json')
      : null;
  const effective = {
    ...standalone,
    ...(statusPath ? { TETRIS_QA2_SUBRUN_STATUS: statusPath } : {})
  };
  const childOptions = { ...options, env: effective };
  const result = nativeSpawnSync(executable, argv, childOptions);
  let supervisorActual = null;
  if (statusPath && fs.existsSync(statusPath))
    supervisorActual = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
  subrunTelemetry({
    domain:
      argv[0] === supervisor ? 'supervisor-native-observer' : 'native-control',
    executable,
    argv,
    cwd: options.cwd,
    inheritedEnvironment: environmentEvidence(inherited),
    effectiveEnvironment: environmentEvidence(effective),
    recursiveSkipWarningObserved: String(result.stderr).includes(
      'node:test run() is being called recursively'
    ),
    status: result.status,
    signal: result.signal,
    supervisorActual,
    error: result.error
      ? { message: result.error.message, code: result.error.code }
      : null,
    stdout: result.stdout,
    stderr: result.stderr,
    observer:
      argv[0] === supervisor
        ? {
            certificateObserved: String(result.stdout).includes(
              'QA-2: owning finite coverage'
            ),
            diagnostics: String(result.stderr),
            evidenceValidity:
              supervisorActual?.observer ?? 'unavailable: no close telemetry'
          }
        : { applicable: false }
  });
  if (!allowRecursiveWarning) {
    assert.doesNotMatch(
      String(result.stderr),
      /node:test run\(\) is being called recursively/,
      'standalone fixture unexpectedly took recursive-skip path'
    );
  }
  return result;
}
function temporary(fn) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'qa2-regression-'));
  try {
    return fn(folder);
  } finally {
    let removed = false;
    try {
      fs.rmSync(folder, { recursive: true, force: true });
      removed = true;
    } finally {
      subrunTelemetry({ domain: 'fixture-cleanup', folder, removed });
    }
  }
}
function gameFixture(folder) {
  fs.writeFileSync(
    path.join(folder, 'package.json'),
    JSON.stringify({ type: 'module' })
  );
  fs.mkdirSync(path.join(folder, 'public/game'), { recursive: true });
  fs.writeFileSync(
    path.join(folder, 'public/game/logic.js'),
    'export const answer = 42;\n'
  );
}
const flags = [
  '--test',
  '--experimental-test-coverage',
  '--test-coverage-include=public/game/**',
  '--test-coverage-lines=100',
  '--test-coverage-branches=100',
  '--test-coverage-functions=100'
];
function run(folder, tail, extra = [], allowRecursiveWarning = false) {
  const result = spawnSync(
    process.execPath,
    [supervisor, ...flags, ...extra, ...tail],
    {
      cwd: folder,
      encoding: 'utf8',
      timeout: 20000,
      maxBuffer: 1024 * 1024
    },
    allowRecursiveWarning
  );
  return result;
}
void test('native evidence code-unit hashing is invariant at surrogate boundaries [QA-2]', () => {
  const whole = 'a\ud83d\ude00\ud800z';
  assert.deepEqual(
    C.textHash([whole]),
    C.textHash(['a\ud83d', '\ude00', '\ud800z'])
  );
  assert.equal(
    C.textHash([whole]).digest.toString('hex'),
    createHash('sha256').update(Buffer.from(whole, 'utf16le')).digest('hex')
  );
});
void test('native source decoder keeps raw bytes distinct and matches whole-file UTF8 text [QA-2]', () =>
  temporary((folder) => {
    const filename = path.join(folder, 'invalid.js');
    const bytes = Buffer.concat([
      Buffer.alloc(65535, 0x61),
      Buffer.from([0xe2, 0x82, 0xac, 0xff, 0xf0, 0x9f])
    ]);
    fs.writeFileSync(filename, bytes);
    const identity = C.fileIdentity(filename);
    assert.equal(
      identity.raw.toString('hex'),
      createHash('sha256').update(bytes).digest('hex')
    );
    assert.equal(
      identity.text.toString('hex'),
      C.textHash([fs.readFileSync(filename, 'utf8')]).digest.toString('hex')
    );
  }));
void test('framing preserves long segmented text and rejects orphan data [QA-2]', () =>
  temporary((folder) => {
    const launch = randomBytes(16),
      writer = new C.Writer(folder, launch, 123, randomBytes(16));
    const text = 'x'.repeat(70000) + '\ud800';
    writer.record(1, [1, text, 'linux', 'x64', 123, true, false]);
    writer.record(6, [C.ZERO, writer.sequence]);
    const seen = [];
    C.readEvidence(folder, launch, 123, (kind, values) =>
      seen.push([kind, values])
    );
    assert.equal(seen[0][1][1], text);
    fs.writeFileSync(path.join(folder, 'orphan.stage'), 'x');
    assert.throws(() => {
      C.readEvidence(folder, launch, 123, () => {});
    }, /orphan|unknown/);
  }));
void test('issue-329 equivalent empty-directory witness fails specifically for required membership [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.mkdirSync(path.join(folder, 'empty-tests'));
    fs.writeFileSync(path.join(folder, 'empty-tests/empty.test.mjs'), '');
    const result = run(folder, ['empty-tests']);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /QA-2 observer incomplete: required source membership missing/
    );
  }));
void test('an owning successful finite run can cover the complete discovered source set [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import {test} from 'node:test';\n" +
        "import assert from 'node:assert/strict';\n" +
        "import {answer} from './public/game/logic.js';\n" +
        "test('answer',()=>assert.equal(answer,42));\n"
    );
    const result = run(folder, ['complete.test.mjs']);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /owning finite coverage/);
  }));
void test('lowered native thresholds cannot excuse missing required game sources [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'public/game/missing.js'),
      'export const missing = 1;\n'
    );
    fs.writeFileSync(
      path.join(folder, 'partial.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    const result = run(
      folder,
      ['partial.test.mjs'],
      [
        '--test-coverage-lines=0',
        '--test-coverage-branches=0',
        '--test-coverage-functions=0'
      ]
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
  }));
void test('an omitted zero-byte source receives no invented native measurement [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(path.join(folder, 'public/game/empty.js'), '');
    fs.writeFileSync(
      path.join(folder, 'partial.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    const result = run(folder, ['partial.test.mjs']);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
  }));
void test('native failure cannot become success from a complete coverage stream [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'failure.test.mjs'),
      "import './public/game/logic.js';\nimport {test} from 'node:test';\ntest('fails',()=>{throw new Error('expected failure');});\n"
    );
    const result = run(folder, ['failure.test.mjs']);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /QA-2: owning finite/);
  }));
void test('private evidence validation rejects absent completion even for an otherwise empty directory [QA-2]', () =>
  temporary((folder) => {
    assert.throws(() => {
      validate(folder, randomBytes(16), 123, []);
    });
  }));
void test('typed decoder rejects malformed lengths and incomplete fields [QA-2]', () => {
  const odd = Buffer.alloc(8);
  odd.writeBigUInt64BE(3n);
  const decoder = new C.Decoder(1);
  decoder.push(
    Buffer.concat([
      Buffer.from([0, 0, 0, 0, 0, 0, 0, 8]),
      Buffer.from([0, 0, 0, 0, 0, 0, 0, 1])
    ])
  );
  assert.throws(() => {
    decoder.push(odd);
  }, /length/);
  const incomplete = new C.Decoder(6);
  incomplete.push(Buffer.from([0, 0]));
  assert.throws(() => incomplete.end(), /incomplete/);
});
void test('frame binding rejects a different launch and altered payload [QA-2]', () =>
  temporary((folder) => {
    const launch = randomBytes(16),
      writer = new C.Writer(folder, launch, 123, randomBytes(16));
    writer.record(1, [1, 'v26', 'linux', 'x64', 123, true, false]);
    writer.record(6, [C.ZERO, writer.sequence]);
    assert.throws(() => {
      C.readEvidence(folder, randomBytes(16), 123, () => {});
    }, /binding/);
    const file = path.join(folder, '0000000000000000.frame'),
      bytes = fs.readFileSync(file);
    bytes[bytes.length - 1] ^= 1;
    fs.writeFileSync(file, bytes);
    assert.throws(() => {
      C.readEvidence(folder, launch, 123, () => {});
    }, /binding|chain/);
  }));
void test('evidence data after a terminal seal is not silently ignored [QA-2]', () =>
  temporary((folder) => {
    const launch = randomBytes(16),
      writer = new C.Writer(folder, launch, 123, randomBytes(16));
    writer.record(6, [C.ZERO, 0]);
    fs.writeFileSync(
      path.join(folder, '0000000000000001.frame'),
      fs.readFileSync(path.join(folder, '0000000000000000.frame'))
    );
    assert.throws(() => {
      C.readEvidence(folder, launch, 123, () => {});
    }, /later|orphan|unknown/);
  }));
void test('source inventory discovers nested files and does not invent empty-file counts [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.mkdirSync(path.join(folder, 'public/game/nested'));
    fs.writeFileSync(path.join(folder, 'public/game/nested/empty.js'), '');
    const rows = C.inventory(folder),
      empty = rows.find((r) => r[1].endsWith('empty.js'));
    assert.ok(empty);
    assert.equal(empty[4], 0);
    assert.equal(empty[6], 0);
    assert.equal(empty[5].toString('hex'), createHash('sha256').digest('hex'));
    assert.ok(rows.some((r) => r[3] === 2));
  }));
void test('unknown source forms are explicit domain conflicts rather than ignored entries [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'public/game/future.ts'),
      'export const future = 1;'
    );
    assert.throws(() => C.inventory(folder), /unknown source-domain/);
  }));
void test('native isolation none retains required finite acceptance [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\nimport {test} from 'node:test';\ntest('native',()=>{});\n"
    );
    const result = run(
      folder,
      ['complete.test.mjs'],
      ['--test-isolation=none']
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
  }));
void test('native force-exit still requires synchronously complete finite evidence [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\nimport {test} from 'node:test';\ntest('native',()=>{});\n"
    );
    const result = run(folder, ['complete.test.mjs'], ['--test-force-exit']);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
  }));
void test('a failing custom reporter cannot acquire a coverage success [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    fs.writeFileSync(
      path.join(folder, 'reporter.mjs'),
      "export default async function*(source){for await(const event of source){if(event.type==='test:coverage')throw new Error('expected reporter failure');yield '';}}\n"
    );
    const result = run(
      folder,
      ['complete.test.mjs'],
      ['--test-reporter=./reporter.mjs']
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /QA-2: owning finite/);
  }));
void test('private evidence does not replace the user native coverage destination [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    const destination = path.join(folder, 'user-coverage');
    const result = spawnSync(
      process.execPath,
      [supervisor, ...flags, 'complete.test.mjs'],
      {
        cwd: folder,
        env: { ...process.env, NODE_V8_COVERAGE: destination },
        encoding: 'utf8',
        timeout: 20000,
        maxBuffer: 1024 * 1024
      }
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      fs.readdirSync(destination).some((name) => name.startsWith('coverage-'))
    );
  }));
void test('watch keeps its lifetime and never publishes a finite certificate before interruption [QA-2]', async () => {
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'qa2-watch-'));
  let child,
    childClosed = false,
    childClosedAt = null;
  try {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'watch.test.mjs'),
      "import './public/game/logic.js';\n"
    );

    const watchStatus = process.env.TETRIS_QA2_CASE_TELEMETRY
      ? path.join(
          process.env.TETRIS_QA2_CASE_TELEMETRY,
          'watch-native-status.json'
        )
      : null;
    const watchInherited = { ...process.env };
    const watchEffective = {
      ...fixtureEnvironment(watchInherited),
      ...(watchStatus ? { TETRIS_QA2_SUBRUN_STATUS: watchStatus } : {})
    };
    child = spawn(
      process.execPath,
      [supervisor, ...flags, '--watch', 'watch.test.mjs'],
      {
        cwd: folder,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: watchEffective
      }
    );
    const watchLaunchedAt = process.hrtime.bigint();
    let output = '',
      errorOutput = '';
    child.stdout.on('data', (b) => {
      output += b;
    });
    child.stderr.on('data', (b) => {
      errorOutput += b;
    });
    child.once('close', () => {
      childClosed = true;
      childClosedAt = process.hrtime.bigint();
    });
    const closed = once(child, 'close');
    for (
      let watchSettleAttempt = 0;
      watchSettleAttempt < 3;
      watchSettleAttempt++
    ) {
      const watchSettleElapsedMs =
        Number(process.hrtime.bigint() - watchLaunchedAt) / 1e6;
      if (watchSettleElapsedMs >= 1500) break;
      await new Promise((resolve) =>
        setTimeout(resolve, 1500 - watchSettleElapsedMs + 5)
      );
    }
    const aliveCheckpoint = Object.freeze({
      elapsedMs: Number(process.hrtime.bigint() - watchLaunchedAt) / 1e6,
      exitCode: child.exitCode,
      signalCode: child.signalCode
    });
    assert.equal(
      child.exitCode,
      null,
      'watch must not be killed for missing readiness'
    );
    assert.equal(
      child.signalCode,
      null,
      'watch must not be signaled before interruption'
    );
    assert.ok(
      aliveCheckpoint.elapsedMs >= 1500,
      'watch alive checkpoint must follow the full 1.5s settle'
    );
    assert.doesNotMatch(
      errorOutput,
      /node:test run\(\) is being called recursively/
    );
    assert.doesNotMatch(output, /QA-2: owning finite/);
    const sigintRequestedAt = process.hrtime.bigint();
    const interruption = {
      requestedSignal: 'SIGINT',
      delivered: child.kill('SIGINT')
    };
    let deadline;
    let result;
    try {
      result = await Promise.race([
        closed,
        new Promise((_resolve, reject) => {
          deadline = setTimeout(() => {
            reject(new Error('watch close deadline'));
          }, 12000);
        })
      ]);
    } finally {
      clearTimeout(deadline);
    }
    interruption.sigintRequestedAtMs = Number(sigintRequestedAt) / 1e6;
    interruption.closeAtMs = Number(childClosedAt) / 1e6;
    subrunTelemetry({
      domain: 'watch-supervisor',
      status: result[0],
      signal: result[1],
      aliveCheckpoint,
      interruption,
      inheritedEnvironment: environmentEvidence(watchInherited),
      effectiveEnvironment: environmentEvidence(watchEffective),
      recursiveSkipWarningObserved: errorOutput.includes(
        'node:test run() is being called recursively'
      ),
      stderrObservationPoint: 'after direct-child close',
      supervisorActual:
        watchStatus && fs.existsSync(watchStatus)
          ? JSON.parse(fs.readFileSync(watchStatus, 'utf8'))
          : null,
      stdout: output,
      stderr: errorOutput,
      observer: {
        certificateObserved: output.includes('QA-2: owning finite coverage'),
        evidenceValidity: 'watch cannot certify finite coverage'
      }
    });
    assert.doesNotMatch(
      errorOutput,
      /node:test run\(\) is being called recursively/,
      'standalone watch fixture unexpectedly took recursive-skip path before close'
    );
    assert.ok(result[0] !== 0 || result[1] !== null, errorOutput);
    const sigintToCloseMs = Number(childClosedAt - sigintRequestedAt) / 1e6;
    assert.ok(
      Number.isFinite(sigintToCloseMs) &&
        sigintToCloseMs >= 0 &&
        sigintToCloseMs <= 12000,
      'watch sigint-to-close interval must be finite, nonnegative, and within the 12s close deadline'
    );
    assert.doesNotMatch(output, /QA-2: owning finite/);
  } finally {
    if (child && !childClosed) {
      const reaped = once(child, 'close');
      if (child.exitCode === null && child.signalCode === null)
        child.kill('SIGKILL');
      let cleanupDeadline;
      try {
        await Promise.race([
          reaped,
          new Promise((_resolve, reject) => {
            cleanupDeadline = setTimeout(() => {
              reject(
                new Error(
                  'fixture cleanup incomplete: direct-child close missing; directory retained at ' +
                    folder
                )
              );
            }, 5000);
          })
        ]);
      } finally {
        clearTimeout(cleanupDeadline);
      }
    }
    fs.rmSync(folder, { recursive: true, force: true });
    subrunTelemetry({
      domain: 'fixture-cleanup',
      folder,
      removed: true,
      directChildClosed: childClosed
    });
  }
});
void test('raw-byte identity distinguishes sources with equal replacement-decoded text [QA-2]', () =>
  temporary((folder) => {
    const a = path.join(folder, 'a.js'),
      b = path.join(folder, 'b.js');
    fs.writeFileSync(a, Buffer.from([0xff]));
    fs.writeFileSync(b, Buffer.from([0xfe]));
    const x = C.fileIdentity(a),
      y = C.fileIdentity(b);
    assert.ok(x.text.equals(y.text));
    assert.ok(!x.raw.equals(y.raw));
  }));
void test('stream decoder agrees with whole-file native text across UTF8 boundaries and EOF [QA-2]', () =>
  temporary((folder) => {
    const filename = path.join(folder, 'boundary.js');
    const patterns = [
      [0xc2, 0xa2],
      [0xe2, 0x82, 0xac],
      [0xf0, 0x9f, 0x98, 0x80],
      [0xe2, 0x28, 0xa1],
      [0xf0, 0x9f],
      [0xed, 0xa0, 0x80]
    ];
    for (const pattern of patterns)
      for (let offset = 0; offset <= pattern.length; offset++) {
        const bytes = Buffer.concat([
          Buffer.alloc(65536 - offset, 0x61),
          Buffer.from(pattern),
          Buffer.from('\r\nlast\n')
        ]);
        fs.writeFileSync(filename, bytes);
        const actual = C.fileIdentity(filename),
          expected = C.textHash([fs.readFileSync(filename, 'utf8')]);
        assert.equal(actual.units, expected.units);
        assert.ok(actual.text.equals(expected.digest));
      }
  }));
void test('frame-size bounds and truncated frame cannot be accepted [QA-2]', () =>
  temporary((folder) => {
    const launch = randomBytes(16),
      filename = path.join(folder, '0000000000000000.frame');
    for (const length of [127, 65537]) {
      fs.writeFileSync(filename, Buffer.alloc(length));
      assert.throws(() => {
        C.readEvidence(folder, launch, 123, () => {});
      }, /size/);
    }
  }));
// prettier-ignore
void test('source links are surfaced as an unresolved domain form [QA-2]',{skip:process.platform==='win32'?'symbolic-link privilege is a separate Windows cell':false},()=>temporary(folder=>{
  gameFixture(folder);
  fs.symlinkSync('logic.js',path.join(folder,'public/game/alias.js'));
  assert.throws(()=>C.inventory(folder),/source-domain link/);
}));
// prettier-ignore
void test('evidence symlinks cannot supply a terminal frame [QA-2]',{skip:process.platform==='win32'?'symbolic-link privilege is a separate Windows cell':false},()=>temporary(folder=>{
  const outside=path.join(folder,'outside');
  fs.writeFileSync(outside,Buffer.alloc(128));
  fs.mkdirSync(path.join(folder,'evidence'));
  fs.symlinkSync(outside,path.join(folder,'evidence/0000000000000000.frame'));
  assert.throws(()=>{ C.readEvidence(path.join(folder,'evidence'),randomBytes(16),123,()=>{}); });
}));
void test('excludes cannot omit a required source even with zero native floors [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    const result = run(
      folder,
      ['complete.test.mjs'],
      [
        '--test-coverage-exclude=public/game/**',
        '--test-coverage-lines=0',
        '--test-coverage-branches=0',
        '--test-coverage-functions=0'
      ]
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
  }));
void test('partial native line coverage fails independently of caller floors [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'public/game/logic.js'),
      'export function unused(){\n return 42;\n}\n'
    );
    fs.writeFileSync(
      path.join(folder, 'partial.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    const result = run(
      folder,
      ['partial.test.mjs'],
      [
        '--test-coverage-lines=0',
        '--test-coverage-branches=0',
        '--test-coverage-functions=0'
      ]
    );
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
  }));
void test('unknown source-domain diagnostics enumerate every encountered unknown entry [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(path.join(folder, 'public/game/a.ts'), '');
    fs.writeFileSync(path.join(folder, 'public/game/b.txt'), '');
    assert.throws(
      () => C.inventory(folder),
      (error) =>
        error.message.includes('a.ts') && error.message.includes('b.txt')
    );
  }));
void test('source change while native runs cannot preserve the prelaunch inventory [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'changed.test.mjs'),
      "import './public/game/logic.js';\n" +
        "import fs from 'node:fs';\n" +
        "fs.appendFileSync('public/game/logic.js','// changed\\n');\n"
    );
    const result = run(folder, ['changed.test.mjs']);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /QA-2: owning finite/);
  }));
void test('a late nonzero process status cannot be repaired by sealed evidence [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'late.test.mjs'),
      "import './public/game/logic.js';\nprocess.on('exit',()=>{process.exitCode=7;});\n"
    );
    const result = run(folder, ['late.test.mjs'], ['--test-isolation=none']);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /QA-2: owning finite/);
  }));
void test('native row expansion retains a legitimate fully covered non-game source [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(path.join(folder, 'extra.js'), 'export const extra=1;\n');
    fs.writeFileSync(
      path.join(folder, 'expanded.test.mjs'),
      "import './public/game/logic.js';\nimport './extra.js';\n"
    );
    const result = run(
      folder,
      ['expanded.test.mjs'],
      ['--test-coverage-include=extra.js']
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
  }));
// Construct protocol controls without borrowing the observer's acceptance code.
// A healthy zero-count row is intentional here: required membership, not a
// fabricated positive code count, is the independently checked condition.
function protocolFixture(folder, alter = () => {}) {
  gameFixture(folder);
  const baseline = C.inventory(folder),
    source = baseline.find((row) => row[3] === 1),
    launch = randomBytes(16),
    pid = 123;
  const inventory = path.join(folder, 'protocol');
  fs.mkdirSync(inventory);
  const begin = [
    1,
    process.version,
    process.platform,
    process.arch,
    pid,
    true,
    false
  ];
  const witness = [
    0,
    pathToFileURL(source[2]).href,
    source[2],
    source[6],
    source[7]
  ];
  const native = [0, source[2], source[2], 0, 0, 0, 0, 0, 0];
  const state = {
    begin,
    baseline,
    witness,
    native,
    omitWitness: false,
    omitNative: false,
    omitManifest: false,
    omitSeal: false,
    extra: [],
    manifestEdit: () => {}
  };
  alter(state);
  const writer = new C.Writer(inventory, launch, pid, randomBytes(16));
  writer.record(1, state.begin);
  const ih = createHash('sha256'),
    wh = createHash('sha256'),
    rh = createHash('sha256');
  for (const row of state.baseline) {
    writer.record(2, row);
    C.updateCategory(ih, 2, row);
  }
  if (!state.omitWitness) {
    writer.record(3, state.witness);
    C.updateCategory(wh, 3, state.witness);
  }
  if (!state.omitNative) {
    writer.record(4, state.native);
    C.updateCategory(rh, 4, state.native);
  }
  for (const [kind, row] of state.extra) writer.record(kind, row);
  const manifest = [
    state.baseline.length,
    1,
    state.omitWitness ? 0 : 1,
    state.omitNative ? 0 : 1,
    ...(state.omitNative ? [0, 0, 0, 0, 0, 0] : state.native.slice(3)),
    ih.digest(),
    wh.digest(),
    rh.digest(),
    true,
    true,
    true,
    true,
    true
  ];
  state.manifestEdit(manifest);
  if (!state.omitManifest) writer.record(5, manifest);
  if (!state.omitSeal)
    writer.record(6, [C.recordHash(5, manifest), writer.sequence]);
  return { baseline, launch, pid, directory: inventory };
}
void test('independent supervisor validates an internally consistent complete protocol control [QA-2]', () =>
  temporary((folder) => {
    const p = protocolFixture(folder);
    assert.doesNotThrow(() => {
      validate(p.directory, p.launch, p.pid, p.baseline);
    });
  }));
for (const [name, alter] of [
  [
    'missing witness',
    (s) => {
      s.omitWitness = true;
    }
  ],
  [
    'missing required native row',
    (s) => {
      s.omitNative = true;
    }
  ],
  [
    'missing manifest',
    (s) => {
      s.omitManifest = true;
    }
  ],
  [
    'missing seal',
    (s) => {
      s.omitSeal = true;
    }
  ],
  [
    'wrong ordinal',
    (s) => {
      s.native[0] = 1;
    }
  ],
  [
    'decoded source mismatch',
    (s) => {
      s.witness[4] = Buffer.alloc(32, 1);
    }
  ],
  [
    'nonexact covered count',
    (s) => {
      s.native[3] = 1;
    }
  ],
  [
    'forged manifest count',
    (s) => {
      s.manifestEdit = (m) => {
        m[0]++;
      };
    }
  ],
  [
    'forged manifest digest',
    (s) => {
      s.manifestEdit = (m) => {
        m[10] = Buffer.alloc(32, 1);
      };
    }
  ],
  [
    'false normal completion',
    (s) => {
      s.manifestEdit = (m) => {
        m[16] = false;
      };
    }
  ],
  [
    'duplicate begin',
    (s) => {
      s.extra.push([1, [...s.begin]]);
    }
  ]
])
  void test(`independent supervisor rejects ${name} [QA-2]`, () =>
    temporary((folder) => {
      const p = protocolFixture(folder, alter);
      assert.throws(() => {
        validate(p.directory, p.launch, p.pid, p.baseline);
      });
    }));
for (const [name, change] of [
  ['wrong PID', (p) => p.pid++],
  ['wrong launch', (p) => (p.launch = randomBytes(16))],
  [
    'missing first sequence',
    (p) => {
      fs.unlinkSync(path.join(p.directory, '0000000000000000.frame'));
    }
  ],
  [
    'unknown entry',
    (p) => {
      fs.writeFileSync(path.join(p.directory, 'unknown'), 'x');
    }
  ],
  [
    'orphan stage',
    (p) => {
      fs.writeFileSync(
        path.join(p.directory, '000000000000ffff.frame.stage'),
        'x'
      );
    }
  ],
  [
    'truncated payload',
    (p) => {
      const f = path.join(p.directory, '0000000000000000.frame');
      fs.truncateSync(f, 129);
    }
  ]
])
  void test(`transport rejects ${name} [QA-2]`, () =>
    temporary((folder) => {
      const p = protocolFixture(folder);
      change(p);
      assert.throws(() => {
        validate(p.directory, p.launch, p.pid, p.baseline);
      });
    }));
for (const method of ['openSync', 'writeSync', 'closeSync', 'renameSync'])
  void test(`publication ${method} failure never completes a healthy record [QA-2]`, () =>
    temporary((folder) => {
      const original = fs[method],
        opened = [],
        writer = new C.Writer(folder, randomBytes(16), 123, randomBytes(16));
      let failed = false;
      const originalOpen = fs.openSync;
      if (method === 'closeSync')
        fs.openSync = function (...args) {
          const fd = Reflect.apply(originalOpen, this, args);
          opened.push(fd);
          return fd;
        };
      fs[method] = function (...args) {
        if (!failed) {
          failed = true;
          const error = new Error(`injected ${method}`);
          error.code = 'ENOSPC';
          throw error;
        }
        return Reflect.apply(original, this, args);
      };
      try {
        assert.throws(() => {
          writer.record(6, [C.ZERO, 0]);
        }, /injected/);
        assert.equal(writer.sealed, false);
      } finally {
        fs[method] = original;
        fs.openSync = originalOpen;
        for (const fd of opened) {
          try {
            fs.closeSync(fd);
          } catch {
            // best-effort fd cleanup during injection
          }
        }
      }
    }));
for (const [name, offset] of [
  ['kind', 40],
  ['flags', 41],
  ['reserved', 42],
  ['root transaction', 112],
  ['previous digest', 48],
  ['payload digest', 80]
])
  void test(`frame rejects changed ${name} [QA-2]`, () =>
    temporary((folder) => {
      const p = protocolFixture(folder),
        filename = path.join(p.directory, '0000000000000001.frame'),
        bytes = fs.readFileSync(filename);
      bytes[offset] ^= 0x40;
      fs.writeFileSync(filename, bytes);
      assert.throws(() => {
        validate(p.directory, p.launch, p.pid, p.baseline);
      });
    }));
void test('unsafe count values and arithmetic are rejected rather than rounded [QA-2]', () => {
  for (const n of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => C.integer(n));
  assert.throws(() => C.add(Number.MAX_SAFE_INTEGER, 1));
});
void test('source paths retain URL escapes and native Unicode identity [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    const filename = path.join(folder, 'public/game/space #% é.js');
    fs.writeFileSync(filename, 'export const ok=1;\r\n');
    const rows = C.inventory(folder);
    assert.ok(rows.some((row) => row[2] === C.canonical(filename)));
    assert.equal(fileURLToPath(pathToFileURL(filename)), filename);
  }));
void test('recursive programmatic native runner cannot lend another root its membership [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'inner.mjs'),
      "import './public/game/logic.js';\n"
    );
    fs.writeFileSync(
      path.join(folder, 'outer.test.mjs'),
      "import {run} from 'node:test';\nconst stream=run({files:['inner.mjs']});\nfor await(const event of stream){}\n"
    );
    const result = run(folder, ['outer.test.mjs'], [], true);
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stdout, /QA-2: owning finite/);
  }));
// It models the native call edges explicitly; it cannot qualify a Node release.
function observerModel(folder, mode = {}) {
  const { runInNewContext } = require('node:vm');
  gameFixture(folder);
  const directory = path.join(folder, 'model-evidence');
  fs.mkdirSync(directory);
  const binding = path.join(folder, 'model-pid');
  fs.writeFileSync(binding, '123');
  const config = { isTestRunner: true, setup() {}, watch: Boolean(mode.watch) };
  const counters = {
    tests: 0,
    failed: 0,
    passed: 0,
    cancelled: 0,
    skipped: 0,
    todo: 0,
    topLevel: 0,
    suites: 0
  };
  const source = path.join(folder, 'public/game/logic.js'),
    text = fs.readFileSync(source, 'utf8');
  const zero = {
    totalLineCount: 0,
    coveredLineCount: 0,
    totalBranchCount: 0,
    coveredBranchCount: 0,
    totalFunctionCount: 0,
    coveredFunctionCount: 0
  };
  const nativeError = new Error('native-original-throw');
  let postCalls = 0,
    summaryCalls = 0,
    linesCalls = 0;
  class Collector {
    getLines() {
      linesCalls++;
      return [
        { src: mode.mappedText ? 'different attributed conversion text' : text }
      ];
    }
    summary() {
      summaryCalls++;
      this.getLines(pathToFileURL(source).href);
      if (mode.nativeThrow) throw nativeError;
      return { files: [{ path: source, ...zero }], totals: { ...zero } };
    }
  }
  class Stream {
    coverage(nesting, loc, summary) {
      if (mode.mutateEmission) summary.files[0].coveredLineCount = 1;
      if (mode.coverageThrow) throw nativeError;
    }
    summary(nesting, file, success, counts) {
      if (mode.mutateCounters) counts.failed++;
      if (mode.summaryThrow) throw nativeError;
    }
  }
  const collector = new Collector(),
    unrelated = new Collector();
  const reporter = new Stream();
  let root;
  const harness = {
    config,
    success: true,
    counters,
    watching: Boolean(mode.watch),
    coverage() {
      if (mode.unrelated) unrelated.summary();
      let result = collector.summary();
      if (mode.repeatedCollector) result = collector.summary();
      if (mode.mutateAfterSummary)
        result.files[0].path = path.join(folder, 'unrelated.js');
      return result;
    }
  };
  class Root {
    postRun() {
      postCalls++;
      this.reported = true;
      const summary = this.harness.coverage();
      this.reporter.coverage(this.nesting, this.loc, summary);
      this.reporter.summary(
        this.nesting,
        this.loc.file,
        this.harness.success,
        this.harness.counters,
        0
      );
      if (mode.postThrow) throw nativeError;
      return 'native-post-return';
    }
  }
  root = new Root();
  Object.assign(root, {
    parent: null,
    root: null,
    harness,
    config,
    reporter,
    nesting: 0,
    loc: { file: undefined }
  });
  root.root = root;
  const fakeProcess = {
    pid: 123,
    ppid: 99,
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: () => folder,
    env: {
      TETRIS_QA2_PARENT: '99',
      TETRIS_QA2_BINDING: binding,
      TETRIS_QA2_LAUNCH: 'ab'.repeat(16),
      TETRIS_QA2_DIRECTORY: directory
    },
    stderr: { write() {} },
    exitCode: undefined
  };
  function modelRequire(id) {
    if (id === 'node:worker_threads') return { isMainThread: true };
    if (id === './native-coverage-common.cjs') return C;
    if (id === 'internal/test_runner/test') return { Test: Root };
    if (id === 'internal/test_runner/coverage')
      return { TestCoverage: Collector };
    if (id === 'internal/test_runner/tests_stream')
      return { TestsStream: Stream };
    if (id === 'internal/test_runner/utils')
      return { parseCommandLine: () => config };
    return require(id);
  }
  runInNewContext(
    fs.readFileSync(
      new URL('../scripts/native-coverage-observer.cjs', import.meta.url),
      'utf8'
    ),
    { require: modelRequire, process: fakeProcess, Buffer },
    { filename: 'native-coverage-observer.cjs' }
  );
  if (mode.resetWatch) {
    config.watch = false;
    harness.watching = false;
  }
  return {
    root,
    directory,
    harness,
    collector,
    unrelated,
    nativeError,
    fakeProcess,
    counts: () => ({ postCalls, summaryCalls, linesCalls }),
    validate: () => {
      validate(
        directory,
        Buffer.from('ab'.repeat(16), 'hex'),
        123,
        C.inventory(folder)
      );
    }
  };
}
void test('observer model binds exact owning normal return without using unrelated collector evidence [QA-2]', () =>
  temporary((folder) => {
    const model = observerModel(folder, { unrelated: true });
    assert.equal(model.root.postRun(), 'native-post-return');
    assert.doesNotThrow(model.validate);
    assert.deepEqual(model.counts(), {
      postCalls: 1,
      summaryCalls: 2,
      linesCalls: 2
    });
  }));
for (const mode of [
  'nativeThrow',
  'coverageThrow',
  'summaryThrow',
  'postThrow'
])
  void test(`observer preserves ${mode} original exception identity [QA-2]`, () =>
    temporary((folder) => {
      const model = observerModel(folder, { [mode]: true });
      const original = model.harness.coverage;
      assert.throws(
        () => model.root.postRun(),
        (error) => error === model.nativeError
      );
      assert.equal(model.harness.coverage, original);
      assert.throws(model.validate);
    }));
for (const mode of [
  'mutateEmission',
  'mutateCounters',
  'mutateAfterSummary',
  'repeatedCollector'
])
  void test(`observer rejects ${mode} without replacing native return [QA-2]`, () =>
    temporary((folder) => {
      const model = observerModel(folder, { [mode]: true });
      assert.equal(model.root.postRun(), 'native-post-return');
      assert.throws(model.validate);
    }));
void test('parsed watch classification stays nonfinite after native watch flags reset [QA-2]', () =>
  temporary((folder) => {
    const model = observerModel(folder, { watch: true, resetWatch: true });
    assert.equal(model.root.postRun(), 'native-post-return');
    assert.throws(model.validate);
    assert.equal(fs.readdirSync(model.directory).length, 0);
  }));
void test('a second qualifying root cannot reuse an existing terminal seal [QA-2]', () =>
  temporary((folder) => {
    const model = observerModel(folder);
    model.root.postRun();
    assert.doesNotThrow(model.validate);
    const second = Object.create(Object.getPrototypeOf(model.root));
    Object.assign(second, model.root, { reported: undefined });
    second.root = second;
    second.postRun();
    assert.throws(model.validate);
  }));
void test('reported undefined is eligible but reported true never opens another transaction [QA-2]', () =>
  temporary((folder) => {
    const model = observerModel(folder);
    assert.equal(model.root.reported, undefined);
    model.root.postRun();
    assert.doesNotThrow(model.validate);
    const before = fs.readdirSync(model.directory).length;
    model.root.postRun();
    assert.equal(fs.readdirSync(model.directory).length, before);
  }));
// Deterministic event/timer models are distinct from actual OS signal controls.
function supervisorModel(folder, platform = process.platform, fault = {}) {
  const { runInNewContext } = require('node:vm');
  const { EventEmitter } = require('node:events');
  gameFixture(folder);
  const events = new EventEmitter(),
    child = new EventEmitter();
  const signals = [],
    timers = [],
    messages = [],
    exits = [];
  let clock = 0;
  Object.assign(child, {
    pid: 123,
    exitCode: null,
    signalCode: null,
    kill(name) {
      signals.push({ name, at: clock });
      if (fault.kill) throw new Error('injected kill refusal');
      return true;
    }
  });
  const proc = Object.assign(events, {
    pid: 99,
    execPath: process.execPath,
    argv: ['node', 'supervisor', '--test'],
    env: {},
    version: process.version,
    platform,
    arch: process.arch,
    cwd: () => folder,
    exitCode: undefined,
    exit(code) {
      exits.push({ code, at: clock });
    },
    kill(pid, name) {
      signals.push({ pid, name, at: clock });
      if (fault.selfKill) throw new Error('injected self-signal refusal');
    }
  });
  const fakeFS = Object.create(fs);
  fakeFS.mkdtempSync = () => {
    const target = path.join(folder, 'private');
    fs.mkdirSync(target);
    return target;
  };
  if (fault.cleanup)
    fakeFS.rmSync = () => {
      throw new Error('injected cleanup refusal');
    };
  function modelRequire(id) {
    if (id === 'node:fs') return fakeFS;
    if (id === 'node:child_process') return { spawn: () => child };
    if (id === './native-coverage-common.cjs') return C;
    return require(id);
  }
  const module = { exports: {} };
  modelRequire.main = module;
  const context = {
    require: modelRequire,
    module,
    __dirname: path.dirname(supervisor),
    process: proc,
    Buffer,
    console: {
      log: (m) => messages.push(m),
      error: (...m) => messages.push(m.join(' '))
    },
    setTimeout(fn, ms) {
      const timer = { fn, at: clock + ms, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(t) {
      t.cancelled = true;
    },
    setImmediate(fn) {
      timers.push({ fn, at: clock, cancelled: false });
    }
  };
  runInNewContext(fs.readFileSync(supervisor, 'utf8'), context, {
    filename: 'native-coverage.cjs'
  });
  function advance(ms) {
    const target = clock + ms;
    for (;;) {
      const next = timers
        .filter((t) => !t.cancelled && t.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      next.cancelled = true;
      clock = next.at;
      next.fn();
    }
    clock = target;
  }
  return {
    child,
    proc,
    signals,
    messages,
    exits,
    advance,
    interrupt: (name) => events.emit(name),
    exit(code = 0, signal = null) {
      child.exitCode = code;
      child.signalCode = signal;
      child.emit('exit', code, signal);
    },
    close(code = 0, signal = null) {
      child.exitCode = code;
      child.signalCode = signal;
      child.emit('close', code, signal);
    }
  };
}
void test('POSIX supervisor-only interruption uses absolute 250ms/5s/10s model boundaries [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'linux');
    m.interrupt('SIGINT');
    m.advance(249);
    assert.equal(m.signals.length, 0);
    m.advance(1);
    assert.equal(m.signals[0].name, 'SIGINT');
    m.advance(4750);
    assert.equal(m.signals[1].name, 'SIGKILL');
    m.advance(5000);
    assert.deepEqual(
      m.exits.map((x) => [x.code, x.at]),
      [[1, 10000]]
    );
  }));
void test('exit before close forbids later direct-child signals but retains absolute close deadline [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'darwin');
    m.interrupt('SIGTERM');
    m.advance(100);
    m.exit(null, 'SIGTERM');
    m.advance(9900);
    assert.equal(m.signals.length, 0);
    assert.equal(m.exits[0].at, 10000);
  }));
void test('repeated interruption escalates without extending first close deadline [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'linux');
    m.interrupt('SIGINT');
    m.advance(50);
    m.interrupt('SIGINT');
    assert.deepEqual(
      m.signals.map((s) => [s.name, s.at]),
      [['SIGKILL', 50]]
    );
    m.advance(9950);
    assert.equal(m.exits[0].at, 10000);
    assert.equal(m.signals.length, 1);
  }));
void test('Windows supervisor-only cancellation is forced with five-second model close deadline [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'win32');
    m.interrupt('SIGINT');
    assert.equal(m.signals[0].name, 'SIGKILL');
    m.advance(5000);
    assert.equal(m.exits[0].at, 5000);
  }));
void test('normal close clears cancellation escalation and never accepts interrupted evidence [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'linux');
    m.interrupt('SIGINT');
    m.close(0);
    m.advance(20000);
    assert.equal(m.proc.exitCode, 1);
    assert.equal(m.signals.length, 0);
    assert.equal(m.exits.length, 0);
    assert.ok(!m.messages.some((x) => x.includes('QA-2: owning finite')));
  }));
void test('failed termination stays non-PASS and still reaches the final close deadline [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'linux', { kill: true });
    m.interrupt('SIGINT');
    m.advance(10000);
    assert.equal(m.exits[0].code, 1);
    assert.ok(m.messages.some((x) => x.includes('incomplete cleanup')));
  }));
void test('signal disposition fallback does not call unrelated supervisor handlers directly [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'linux');
    let foreign = 0;
    m.proc.on('SIGTERM', () => foreign++);
    m.exit(null, 'SIGTERM');
    m.close(null, 'SIGTERM');
    m.advance(0);
    assert.equal(foreign, 0);
    assert.ok(m.signals.some((s) => s.pid === 99 && s.name === 'SIGTERM'));
    assert.equal(m.exits[0].code, 1);
  }));
void test('cleanup refusal prevents acceptance and preserves explicit failure diagnostic [QA-2]', () =>
  temporary((folder) => {
    const m = supervisorModel(folder, 'linux', { cleanup: true });
    m.close(0);
    assert.equal(m.proc.exitCode, 1);
    assert.ok(m.messages.some((x) => x.includes('cleanup failed')));
  }));
void test('evidence enumeration failure cannot produce supervisor acceptance [QA-2]', () =>
  temporary((folder) => {
    const p = protocolFixture(folder),
      original = fs.opendirSync;
    fs.opendirSync = () => {
      throw new Error('injected enumeration failure');
    };
    try {
      assert.throws(() => {
        validate(p.directory, p.launch, p.pid, p.baseline);
      }, /enumeration/);
    } finally {
      fs.opendirSync = original;
    }
  }));
void test('source descriptor read failure remains an explicit identity failure [QA-2]', () =>
  temporary((folder) => {
    const filename = path.join(folder, 'source.js');
    fs.writeFileSync(filename, 'x');
    const original = fs.readSync;
    fs.readSync = () => {
      throw new Error('injected read failure');
    };
    try {
      assert.throws(() => C.fileIdentity(filename), /read failure/);
    } finally {
      fs.readSync = original;
    }
  }));
void test('inherited worker or mismatched parent never patches native entry points [QA-2]', () =>
  temporary(() => {
    const { runInNewContext } = require('node:vm');
    let internalReads = 0;
    for (const isMainThread of [true, false]) {
      const code = fs.readFileSync(
        new URL('../scripts/native-coverage-observer.cjs', import.meta.url),
        'utf8'
      );
      runInNewContext(code, {
        require(id) {
          if (id === 'node:worker_threads') return { isMainThread };
          internalReads++;
          throw new Error('ineligible observer touched internals');
        },
        process: { ppid: 100, env: { TETRIS_QA2_PARENT: '99' } }
      });
    }
    assert.equal(internalReads, 0);
  }));
void test('native preload output survives the supervisor launch [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    fs.writeFileSync(
      path.join(folder, 'preload.cjs'),
      "process.stdout.write('user-preload-marker\\n');\n"
    );
    const result = run(
      folder,
      ['complete.test.mjs'],
      ['--require=./preload.cjs']
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /user-preload-marker/);
  }));
void test('native import-hook option remains a native import rather than an observer replacement [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    fs.writeFileSync(
      path.join(folder, 'hook.mjs'),
      "process.stdout.write('user-import-marker\\n');\n"
    );
    const result = run(folder, ['complete.test.mjs'], ['--import=./hook.mjs']);
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /user-import-marker/);
  }));
void test('custom native reporter output destination is not used as evidence transport [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(
      path.join(folder, 'complete.test.mjs'),
      "import './public/game/logic.js';\n"
    );
    const result = run(
      folder,
      ['complete.test.mjs'],
      ['--test-reporter=tap', '--test-reporter-destination=report.tap']
    );
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      fs
        .readFileSync(path.join(folder, 'report.tap'), 'utf8')
        .includes('TAP version')
    );
    assert.match(result.stdout, /QA-2: owning finite/);
  }));
void test('native zero-byte source import does not authorize an invented row if Node omits it [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    fs.writeFileSync(path.join(folder, 'public/game/empty.js'), '');
    fs.writeFileSync(
      path.join(folder, 'empty-import.test.mjs'),
      "import './public/game/logic.js';\nimport './public/game/empty.js';\n"
    );

    fs.writeFileSync(
      path.join(folder, 'native-summary.mjs'),
      "export default async function*(source){for await(const event of source){if(event.type==='test:coverage')yield JSON.stringify(event.data.summary)+'\\n';}}\n"
    );

    const native = spawnSync(
      process.execPath,
      [
        ...flags,
        '--test-reporter=./native-summary.mjs',
        'empty-import.test.mjs'
      ],
      { cwd: folder, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 }
    );
    assert.ifError(native.error);
    assert.equal(native.status, 0, native.stderr);
    const summary = JSON.parse(native.stdout.trim());
    assert.ok(
      Array.isArray(summary.files),
      'native coverage event required for empty-file row'
    );
    const hasEmpty = summary.files.some(
      (file) => file.path === path.join(folder, 'public/game/empty.js')
    );
    const result = run(folder, ['empty-import.test.mjs']);
    assert.ifError(result.error);
    assert.equal(result.status === 0, hasEmpty, result.stderr);
  }));
void test('test-pattern and declaration-pattern entries are not silently dropped from the game domain [QA-2]', () =>
  temporary((folder) => {
    gameFixture(folder);
    for (const name of ['a.test.js', 'b.spec.js', 'types.d.ts'])
      fs.writeFileSync(path.join(folder, 'public/game', name), '');
    assert.throws(
      () => C.inventory(folder),
      (error) =>
        ['a.test.js', 'b.spec.js', 'types.d.ts'].every((name) =>
          error.message.includes(name)
        )
    );
  }));
// Current-base zero-byte stand-in only. Historical issue329 reported no report
// at b6a5000; exact historical filename/bytes were not supplied. That mismatch
// stays open. This observed baseline is not product coverage acceptance.
// prettier-ignore
void test('current-base native zero-byte stand-in observation remains separate from corrected membership rejection [QA-2]',
  {skip:process.version!=='v26.13.0'?'stand-in observation is specifically Node v26.13.0':false},
  ()=>temporary(folder=>{
    gameFixture(folder);
    fs.mkdirSync(path.join(folder,'empty-tests'));
    fs.writeFileSync(path.join(folder,'empty-tests/empty.test.mjs'),'');
    const baseline=spawnSync(process.execPath,[...flags,'empty-tests'],{
      cwd:folder,encoding:'utf8',timeout:20000,maxBuffer:1024*1024,
    });
    assert.ifError(baseline.error);
    assert.equal(baseline.status,0,baseline.stderr);
    assert.doesNotMatch(baseline.stderr,/node:test run\(\) is being called recursively/);
    // Match the measured native presentation, not the historical no-report claim.
    // A file-level pass and an empty 100% table do not exercise game sources.
    assert.match(baseline.stdout,/empty-tests[\\/]empty\.test\.mjs/);
    assert.match(baseline.stdout,/tests 1(?:\r?\n|$)/);
    assert.match(baseline.stdout,/pass 1(?:\r?\n|$)/);
    assert.match(baseline.stdout,/fail 0(?:\r?\n|$)/);
    assert.match(baseline.stdout,/start of coverage report/);
    assert.match(baseline.stdout,/end of coverage report/);
    const coverageLines=baseline.stdout.split(/\r?\n/).filter(line=>line.includes('|'));
    assert.equal(coverageLines.length,2,'expected header and all-files row only, no source rows');
    assert.match(coverageLines[0],/file\s*\|\s*line %\s*\|\s*branch %\s*\|\s*funcs %\s*\|\s*uncovered lines/);
    assert.match(coverageLines[1],/all files\s*\|\s*100\.00\s*\|\s*100\.00\s*\|\s*100\.00\s*\|\s*$/);
    const corrected=run(folder,['empty-tests']);
    assert.ifError(corrected.error);
    assert.notEqual(corrected.status,0);
    assert.match(corrected.stderr,/QA-2 observer incomplete: required source membership missing/);
  }));
void test('an observable source-map text conflict cannot lend required disk-source membership [QA-2]', () =>
  temporary((folder) => {
    const model = observerModel(folder, { mappedText: true });
    assert.equal(model.root.postRun(), 'native-post-return');
    assert.throws(model.validate);
  }));
void test('a missing postspawn PID binding cannot acquire a healthy observer transaction [QA-2]', () =>
  temporary((folder) => {
    const model = observerModel(folder);
    fs.unlinkSync(path.join(folder, 'model-pid'));
    assert.equal(model.root.postRun(), 'native-post-return');
    assert.throws(model.validate);
  }));
void test('frame publication stays within the legal boundary for long code-unit fields [QA-2]', () =>
  temporary((folder) => {
    const launch = randomBytes(16),
      writer = new C.Writer(folder, launch, 123, randomBytes(16));
    const text = 'x'.repeat(65408) + '\ud800';
    writer.record(1, [1, text, 'linux', 'x64', 123, true, false]);
    writer.record(6, [C.ZERO, writer.sequence]);
    for (const name of fs.readdirSync(folder))
      assert.ok(fs.statSync(path.join(folder, name)).size <= 65536);
    const records = [];
    C.readEvidence(folder, launch, 123, (kind, row) => records.push(row));
    assert.equal(records[0][1], text);
  }));
void test('standalone fixture environment removes only native child context without mutating caller [QA-2]', () => {
  const inherited = {
    NODE_TEST_CONTEXT: 'child-v8',
    NODE_OPTIONS: '--example',
    NODE_V8_COVERAGE: 'user-destination',
    CUSTOM: 'preserved'
  };
  const env = fixtureEnvironment(inherited);
  assert.equal(Object.hasOwn(env, 'NODE_TEST_CONTEXT'), false);
  assert.equal(inherited.NODE_TEST_CONTEXT, 'child-v8');
  assert.equal(env.NODE_OPTIONS, inherited.NODE_OPTIONS);
  assert.equal(env.NODE_V8_COVERAGE, inherited.NODE_V8_COVERAGE);
  assert.equal(env.CUSTOM, inherited.CUSTOM);
});
