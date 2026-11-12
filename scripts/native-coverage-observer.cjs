'use strict';
// Observable --require/--expose-internals instrumentation is intentional.
// PID binding is created by the supervisor immediately after spawn and checked
// at the owning transaction. No readiness wait or watchdog is introduced.
const { isMainThread } = require('node:worker_threads');

/** @typedef {import('./native-coverage-common.cjs').Field} Field */
/** @typedef {import('./native-coverage-common.cjs').InventoryRow} InventoryRow */
/** @typedef {Field[]} Row */
/**
 * One coverage summary call seen while the owning coverage call is running.
 * @typedef {object} Candidate
 * @property {unknown} collector
 * @property {Map<string, Row>} witnesses
 * @property {Row[]} witnessRows
 * @property {boolean} invalid
 * @property {unknown} result
 * @property {string | null} snapshot
 * @property {number[] | null} totals
 */
/**
 * @typedef {object} Transaction
 * @property {object} root
 * @property {string} state
 * @property {InstanceType<typeof import('./native-coverage-common.cjs').Writer>} writer
 * @property {InventoryRow[]} entries
 * @property {Candidate[]} candidates
 * @property {Candidate | null} collecting
 * @property {Map<string, InventoryRow>} required
 * @property {Map<string, Row>} witnesses
 * @property {number} witnessCount
 * @property {number} rowCount
 * @property {import('node:crypto').Hash} witnessHash
 * @property {import('node:crypto').Hash} rowHash
 * @property {unknown} [collector]
 * @property {string | null} [snapshot]
 * @property {number[] | null} [totals]
 * @property {unknown} [summary]
 */

if (isMainThread && String(process.ppid) === process.env.TETRIS_QA2_PARENT) {
  const fs = require('node:fs');
  const { randomBytes, createHash } = require('node:crypto');
  const { pathToFileURL, fileURLToPath } = require('node:url');
  const C = require('./native-coverage-common.cjs');
  let invalid = false,
    completed = false;
  /** @type {object | null} */
  let owner = null;
  /** @type {Transaction | null} */
  let active = null;

  // The test runner internals are unknown values until each one is checked at
  // run time. A missing or changed shape throws, which leaves no healthy
  // evidence, as before.
  /**
   * @param {Function} fn
   * @param {unknown} self
   * @param {unknown[]} args
   * @returns {unknown}
   */
  const call = (fn, self, args) => Reflect.apply(fn, self, args);
  /**
   * @param {string} id
   * @returns {unknown}
   */
  const internal = (id) => require(id);
  /**
   * @param {unknown} object
   * @param {string} key
   * @returns {unknown}
   */
  const read = (object, key) => {
    if (
      (typeof object !== 'object' && typeof object !== 'function') ||
      object === null
    )
      throw new Error('missing test runner internal');
    return Reflect.get(object, key);
  };
  /**
   * @param {unknown} object
   * @param {string} key
   * @param {unknown} value
   */
  const write = (object, key, value) => {
    if (
      (typeof object !== 'object' && typeof object !== 'function') ||
      object === null ||
      !Reflect.set(object, key, value)
    )
      throw new Error('test runner internal cannot be observed');
  };
  /**
   * @param {unknown} moduleExports
   * @param {string} name
   */
  const classOf = (moduleExports, name) => {
    const constructor = read(moduleExports, name);
    if (typeof constructor !== 'function')
      throw new Error('missing test runner class');
    const prototype = read(constructor, 'prototype');
    if (typeof prototype !== 'object' || prototype === null)
      throw new Error('missing test runner prototype');
    return { constructor, prototype };
  };
  /**
   * @param {object} prototype
   * @param {string} name
   */
  const methodOf = (prototype, name) => {
    const method = read(prototype, name);
    if (typeof method !== 'function')
      throw new Error('missing test runner method');
    return method;
  };

  const fail = () => {
    invalid = true;
    if (completed) {
      try {
        const directory = process.env.TETRIS_QA2_DIRECTORY;
        if (directory === undefined) throw new Error('missing directory');
        const marker = require('node:path').join(
          directory,
          'invalid-after-completion'
        );
        fs.writeFileSync(marker, 'invalid', { flag: 'wx', mode: 0o600 });
      } catch {
        process.exitCode = 1;
      }
    }
  };
  // Missing/changed internals leave no healthy evidence. Native execution continues.
  try {
    /** @type {unknown} */
    const testModule = internal('internal/test_runner/test');
    /** @type {unknown} */
    const coverageModule = internal('internal/test_runner/coverage');
    /** @type {unknown} */
    const streamModule = internal('internal/test_runner/tests_stream');
    /** @type {unknown} */
    const utilsModule = internal('internal/test_runner/utils');
    const Test = classOf(testModule, 'Test');
    const TestCoverage = classOf(coverageModule, 'TestCoverage');
    const TestsStream = classOf(streamModule, 'TestsStream');
    const parseCommandLine = read(utilsModule, 'parseCommandLine');
    if (typeof parseCommandLine !== 'function')
      throw new Error('missing test runner command line parser');
    /** @type {unknown} */
    const parsed = call(parseCommandLine, undefined, []);
    const setup = read(parsed, 'setup');
    let watchSession = Boolean(read(parsed, 'watch'));
    const saved = {
      post: methodOf(Test.prototype, 'postRun'),
      summary: methodOf(TestCoverage.prototype, 'summary'),
      lines: methodOf(TestCoverage.prototype, 'getLines'),
      coverage: methodOf(TestsStream.prototype, 'coverage'),
      streamSummary: methodOf(TestsStream.prototype, 'summary')
    };
    /** @param {Row} witness */
    const digestOf = (witness) => {
      const digest = witness[4];
      if (!Buffer.isBuffer(digest)) throw new Error('invalid witness digest');
      return digest;
    };
    let diagnosticWritten = false;
    /**
     * @template T
     * @param {() => T} fn
     */
    const capture = (fn) => {
      try {
        return fn();
      } catch (error) {
        fail();
        if (!diagnosticWritten) {
          diagnosticWritten = true;
          try {
            process.stderr.write(
              'QA-2 observer incomplete: ' +
                (error instanceof Error ? error.message : String(error)) +
                '\n'
            );
          } catch {
            /* A failed diagnostic cannot supply acceptance. */
          }
        }
        return undefined;
      }
    };
    /** @param {unknown} summary */
    const filesOf = (summary) => {
      const files = read(summary, 'files');
      if (!Array.isArray(files)) throw new Error('no summary array');
      /** @type {unknown[]} */
      const list = files;
      return list;
    };
    /** @param {unknown} summary */
    const snapshotOf = (summary) =>
      JSON.stringify(
        filesOf(summary).map((row) => [read(row, 'path'), ...C.counts(row)])
      );
    /**
     * @param {Transaction} t
     * @param {unknown} summary
     */
    function sameSummary(t, summary) {
      const totals = t.totals;
      if (!totals) throw new Error('missing owning totals');
      return (
        snapshotOf(summary) === t.snapshot &&
        C.counts(read(summary, 'totals')).every((v, i) => v === totals[i])
      );
    }
    write(
      TestCoverage.prototype,
      'getLines',
      /** @this {unknown} */
      function (/** @type {unknown[]} */ ...args) {
        const result = call(saved.lines, this, args);
        const t = active,
          candidate = t?.collecting;
        if (candidate && candidate.collector === this) {
          try {
            if (!Array.isArray(result)) throw new Error('missing source lines');
            const url = args[0];
            if (typeof url !== 'string') throw new Error('invalid source url');
            const canonical = C.canonical(fileURLToPath(url));
            /** @type {unknown[]} */
            const lines = result;
            const text = C.textHash(
              (function* () {
                for (const line of lines) yield read(line, 'src');
              })()
            );
            const prior = candidate.witnesses.get(url);
            if (
              prior &&
              (prior[2] !== canonical ||
                prior[3] !== text.units ||
                !digestOf(prior).equals(text.digest))
            )
              throw new Error('contradictory witness');
            /** @type {Row} */
            const row = [
              candidate.witnessRows.length,
              url,
              canonical,
              text.units,
              text.digest
            ];
            candidate.witnessRows.push(row);
            candidate.witnesses.set(url, row);
          } catch {
            candidate.invalid = true;
          }
        }
        return result;
      }
    );
    write(
      TestCoverage.prototype,
      'summary',
      /** @this {unknown} */
      function (/** @type {unknown[]} */ ...args) {
        const t = active;
        if (!t || t.state !== 'COVERAGE_CALL')
          return call(saved.summary, this, args);
        const previous = t.collecting;
        /** @type {Candidate} */
        const candidate = {
          collector: this,
          witnesses: new Map(),
          witnessRows: [],
          invalid: false,
          result: null,
          snapshot: null,
          totals: null
        };
        if (previous && previous.collector === this) {
          previous.invalid = true;
          candidate.invalid = true;
        }
        t.collecting = candidate;
        let result;
        try {
          result = call(saved.summary, this, args);
        } finally {
          t.collecting = previous;
        }
        try {
          candidate.result = result;
          candidate.snapshot = snapshotOf(result);
          candidate.totals = C.counts(read(result, 'totals'));
          t.candidates.push(candidate);
        } catch {
          candidate.invalid = true;
          fail();
        }
        return result;
      }
    );
    /**
     * @param {Transaction} t
     * @param {unknown} result
     */
    function publishSelected(t, result) {
      const matches = t.candidates.filter(
        (candidate) => candidate.result === result
      );
      const selected = matches[0];
      if (matches.length !== 1 || selected.invalid)
        throw new Error('no unique owning summary');
      const files = filesOf(result);
      if (
        t.candidates.filter(
          (candidate) => candidate.collector === selected.collector
        ).length !== 1
      ) {
        throw new Error('repeated owning collector');
      }
      t.collector = selected.collector;
      t.witnesses = selected.witnesses;
      t.snapshot = selected.snapshot;
      t.totals = selected.totals;
      if (!sameSummary(t, result))
        throw new Error('summary changed before owning coverage return');
      for (const row of selected.witnessRows) {
        t.writer.record(3, row);
        C.updateCategory(t.witnessHash, 3, row);
        t.witnessCount = C.add(t.witnessCount, 1);
      }
      const sums = [0, 0, 0, 0, 0, 0],
        required = new Set();
      for (const native of files) {
        const nativePath = read(native, 'path');
        if (typeof nativePath !== 'string')
          throw new Error('row has no native path');
        const canonical = C.canonical(nativePath),
          url = pathToFileURL(nativePath).href;
        const witness = t.witnesses.get(url);
        if (!witness || witness[2] !== canonical)
          throw new Error('row has no owning conversion witness');
        const source = t.required.get(canonical);
        if (source) {
          if (
            source[6] !== witness[3] ||
            !source[7].equals(digestOf(witness))
          ) {
            throw new Error('conversion/source mismatch');
          }
          required.add(canonical);
        }
        const counts = C.counts(native);
        for (let i = 0; i < 6; i += 2) {
          if (counts[i] !== counts[i + 1])
            throw new Error('native row below exact 100%');
        }
        counts.forEach((n, i) => {
          sums[i] = C.add(sums[i], n);
        });
        /** @type {Row} */
        const row = [t.rowCount, nativePath, canonical, ...counts];
        t.writer.record(4, row);
        C.updateCategory(t.rowHash, 4, row);
        t.rowCount = C.add(t.rowCount, 1);
      }
      if (required.size !== t.required.size)
        throw new Error('required source membership missing');
      const totals = t.totals;
      if (!totals || !sums.every((n, i) => n === totals[i]))
        throw new Error('native totals mismatch');
      t.summary = result;
      t.candidates = [];
    }
    write(
      TestsStream.prototype,
      'coverage',
      /** @this {unknown} */
      function (/** @type {unknown[]} */ ...args) {
        const t = active,
          owning = t !== null && this === read(t.root, 'reporter');
        if (owning)
          capture(() => {
            if (
              t.state !== 'COVERAGE_RETURNED' ||
              args[2] !== t.summary ||
              !sameSummary(t, args[2])
            ) {
              throw new Error('foreign/mutated coverage emission');
            }
          });
        let result;
        try {
          result = call(saved.coverage, this, args);
        } catch (error) {
          if (owning) fail();
          throw error;
        }
        if (owning)
          capture(() => {
            if (!sameSummary(t, args[2]))
              throw new Error('coverage mutated during emission');
            t.state = 'COVERAGE_EMITTED';
          });
        return result;
      }
    );
    const fields = [
      'tests',
      'failed',
      'passed',
      'cancelled',
      'skipped',
      'todo',
      'topLevel',
      'suites'
    ];
    write(
      TestsStream.prototype,
      'summary',
      /** @this {unknown} */
      function (/** @type {unknown[]} */ ...args) {
        const t = active,
          owning = t !== null && this === read(t.root, 'reporter');
        /** @type {number[] | undefined} */
        let before;
        const valid = () => {
          if (!t) return false;
          const root = t.root;
          const harness = read(root, 'harness');
          const loc = read(root, 'loc');
          // The file is optional, as in the runner: no location means no file.
          const file =
            loc === undefined || loc === null ? undefined : read(loc, 'file');
          return (
            t.state === 'COVERAGE_EMITTED' &&
            args[0] === read(root, 'nesting') &&
            args[1] === file &&
            args[2] === true &&
            read(harness, 'success') === true &&
            args[3] === read(harness, 'counters')
          );
        };
        if (owning)
          capture(() => {
            if (!valid()) throw new Error('foreign/failed summary');
            before = fields.map((k) => C.integer(read(args[3], k)));
          });
        let result;
        try {
          result = call(saved.streamSummary, this, args);
        } catch (error) {
          if (owning) fail();
          throw error;
        }
        if (owning)
          capture(() => {
            const snapshot = before;
            if (
              !snapshot ||
              !valid() ||
              !fields.every((k, i) => read(args[3], k) === snapshot[i])
            ) {
              throw new Error('summary counters changed');
            }
            t.state = 'SUMMARY_EMITTED';
          });
        return result;
      }
    );
    /**
     * @param {object} self
     * @param {unknown[]} args
     */
    function observePostRun(self, args) {
      /** @param {unknown} value */
      const isStream = (value) =>
        typeof value === 'object' &&
        value !== null &&
        Object.prototype.isPrototypeOf.call(TestsStream.prototype, value);
      const harnessValue = read(self, 'harness');
      const qualifies =
        read(self, 'parent') === null &&
        read(self, 'root') === self &&
        Boolean(harnessValue) &&
        read(self, 'config') === read(harnessValue, 'config') &&
        read(read(self, 'config'), 'isTestRunner') === true &&
        read(read(self, 'config'), 'setup') === setup &&
        isStream(read(self, 'reporter')) &&
        typeof read(harnessValue, 'coverage') === 'function';
      if (
        qualifies &&
        (read(read(self, 'config'), 'watch') || read(harnessValue, 'watching'))
      )
        watchSession = true;
      if (!qualifies || read(self, 'reported') || watchSession)
        return call(saved.post, self, args);
      if (completed || active || (owner && owner !== self)) {
        fail();
        return call(saved.post, self, args);
      }
      owner = self;
      /** @type {Transaction | undefined} */
      let t;
      capture(() => {
        if (
          fs.readFileSync(String(process.env.TETRIS_QA2_BINDING), 'utf8') !==
          String(process.pid)
        ) {
          throw new Error('foreign or missing expected PID');
        }
        const launch = Buffer.from(
          String(process.env.TETRIS_QA2_LAUNCH),
          'hex'
        );
        if (launch.length !== 16) throw new Error('launch binding');
        const entries = C.inventory(process.cwd());
        const writer = new C.Writer(
          String(process.env.TETRIS_QA2_DIRECTORY),
          launch,
          process.pid,
          randomBytes(16)
        );
        t = {
          root: self,
          state: 'SELECTED',
          writer,
          entries,
          candidates: [],
          collecting: null,
          required: new Map(
            entries.filter((r) => r[3] === 1).map((r) => [r[2], r])
          ),
          witnesses: new Map(),
          witnessCount: 0,
          rowCount: 0,
          witnessHash: createHash('sha256'),
          rowHash: createHash('sha256')
        };
        writer.record(1, [
          1,
          process.version,
          process.platform,
          process.arch,
          process.pid,
          true,
          false
        ]);
        for (const row of entries) writer.record(2, row);
      });
      if (!t) return call(saved.post, self, args);
      const transaction = t;
      const harness = harnessValue,
        original = read(harness, 'coverage');
      if (typeof original !== 'function')
        throw new Error('missing harness coverage');
      /**
       * @this {unknown}
       * @param {unknown[]} coverageArgs
       */
      const wrapped = function (...coverageArgs) {
        if (transaction.state !== 'SELECTED') fail();
        transaction.state = 'COVERAGE_CALL';
        let result;
        try {
          result = call(original, this, coverageArgs);
        } catch (error) {
          fail();
          throw error;
        }
        capture(() => {
          if (transaction.state !== 'COVERAGE_CALL')
            throw new Error('incomplete owning coverage');
          publishSelected(transaction, result);
        });
        transaction.state = 'COVERAGE_RETURNED';
        return result;
      };
      active = transaction;
      write(harness, 'coverage', wrapped);
      let result;
      try {
        result = call(saved.post, self, args);
      } catch (error) {
        fail();
        throw error;
      } finally {
        if (read(harness, 'coverage') === wrapped)
          write(harness, 'coverage', original);
        else fail();
        active = null;
      }
      completed = true;
      capture(() => {
        if (
          invalid ||
          watchSession ||
          transaction.state !== 'SUMMARY_EMITTED' ||
          read(read(self, 'config'), 'watch') ||
          read(harness, 'watching') ||
          !read(harness, 'success')
        )
          throw new Error('incomplete finite transaction');
        transaction.state = 'POSTRUN_RETURNED';
        const totals = transaction.totals;
        if (!totals) throw new Error('missing owning totals');
        /** @type {Row} */
        const manifest = [
          transaction.entries.length,
          transaction.required.size,
          transaction.witnessCount,
          transaction.rowCount,
          ...totals,
          C.inventoryDigest(transaction.entries),
          transaction.witnessHash.digest(),
          transaction.rowHash.digest(),
          true,
          true,
          true,
          true,
          true
        ];
        transaction.writer.record(5, manifest);
        transaction.writer.record(6, [
          C.recordHash(5, manifest),
          transaction.writer.sequence
        ]);
        transaction.state = 'SEALED';
      });
      return result;
    }
    write(
      Test.prototype,
      'postRun',
      /** @this {object} */
      function (/** @type {unknown[]} */ ...args) {
        return observePostRun(this, args);
      }
    );
  } catch {
    fail();
  }
}
