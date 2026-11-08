'use strict';
// Observable --require/--expose-internals instrumentation is intentional.
// PID binding is created by the supervisor immediately after spawn and checked
// at the owning transaction. No readiness wait or watchdog is introduced.
const { isMainThread } = require('node:worker_threads');
if (isMainThread && String(process.ppid) === process.env.TETRIS_QA2_PARENT) {
  const fs = require('node:fs');
  const { randomBytes, createHash } = require('node:crypto');
  const { pathToFileURL, fileURLToPath } = require('node:url');
  const C = require('./native-coverage-common.cjs');
  let invalid = false,
    owner = null,
    active = null,
    completed = false;
  const fail = () => {
    invalid = true;
    if (completed) {
      try {
        const marker = require('node:path').join(
          process.env.TETRIS_QA2_DIRECTORY,
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
    const { Test } = require('internal/test_runner/test');
    const { TestCoverage } = require('internal/test_runner/coverage');
    const { TestsStream } = require('internal/test_runner/tests_stream');
    const parsed = require('internal/test_runner/utils').parseCommandLine();
    const setup = parsed.setup;
    let watchSession = Boolean(parsed.watch);
    const saved = {
      post: Test.prototype.postRun,
      summary: TestCoverage.prototype.summary,
      lines: TestCoverage.prototype.getLines,
      coverage: TestsStream.prototype.coverage,
      streamSummary: TestsStream.prototype.summary
    };
    let diagnosticWritten = false;
    const capture = (fn) => {
      try {
        return fn();
      } catch (error) {
        fail();
        if (!diagnosticWritten) {
          diagnosticWritten = true;
          try {
            process.stderr.write(
              'QA-2 observer incomplete: ' + error.message + '\n'
            );
          } catch {
            /* A failed diagnostic cannot supply acceptance. */
          }
        }
        return undefined;
      }
    };
    function sameSummary(t, summary) {
      const rows = summary.files.map((row) => [row.path, ...C.counts(row)]);
      return (
        JSON.stringify(rows) === t.snapshot &&
        C.counts(summary.totals).every((v, i) => v === t.totals[i])
      );
    }
    TestCoverage.prototype.getLines = function (...args) {
      const result = Reflect.apply(saved.lines, this, args);
      const t = active,
        candidate = t?.collecting;
      if (candidate && candidate.collector === this) {
        try {
          if (!Array.isArray(result)) throw new Error('missing source lines');
          const url = args[0],
            canonical = C.canonical(fileURLToPath(url));
          const text = C.textHash(
            (function* () {
              for (const line of result) yield line.src;
            })()
          );
          const prior = candidate.witnesses.get(url);
          if (
            prior &&
            (prior[2] !== canonical ||
              prior[3] !== text.units ||
              !prior[4].equals(text.digest))
          )
            throw new Error('contradictory witness');
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
    };
    TestCoverage.prototype.summary = function (...args) {
      const t = active;
      if (!t || t.state !== 'COVERAGE_CALL')
        return Reflect.apply(saved.summary, this, args);
      const previous = t.collecting;
      let candidate;
      try {
        candidate = {
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
      } catch {
        fail();
        return Reflect.apply(saved.summary, this, args);
      }
      let result;
      try {
        result = Reflect.apply(saved.summary, this, args);
      } finally {
        t.collecting = previous;
      }
      try {
        candidate.result = result;
        if (!result || !Array.isArray(result.files))
          throw new Error('no summary array');
        candidate.snapshot = JSON.stringify(
          result.files.map((row) => [row.path, ...C.counts(row)])
        );
        candidate.totals = C.counts(result.totals);
        t.candidates.push(candidate);
      } catch {
        candidate.invalid = true;
        fail();
      }
      return result;
    };
    function publishSelected(t, result) {
      const matches = t.candidates.filter(
        (candidate) => candidate.result === result
      );
      if (
        matches.length !== 1 ||
        matches[0].invalid ||
        !result ||
        !Array.isArray(result.files)
      ) {
        throw new Error('no unique owning summary');
      }
      const selected = matches[0];
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
      for (const native of result.files) {
        const canonical = C.canonical(native.path),
          url = pathToFileURL(native.path).href;
        const witness = t.witnesses.get(url);
        if (!witness || witness[2] !== canonical)
          throw new Error('row has no owning conversion witness');
        const source = t.required.get(canonical);
        if (source) {
          if (source[6] !== witness[3] || !source[7].equals(witness[4])) {
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
        const row = [t.rowCount, native.path, canonical, ...counts];
        t.writer.record(4, row);
        C.updateCategory(t.rowHash, 4, row);
        t.rowCount = C.add(t.rowCount, 1);
      }
      if (required.size !== t.required.size)
        throw new Error('required source membership missing');
      if (!sums.every((n, i) => n === t.totals[i]))
        throw new Error('native totals mismatch');
      t.summary = result;
      t.candidates = [];
    }
    TestsStream.prototype.coverage = function (...args) {
      const t = active,
        owning = t && this === t.root.reporter;
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
        result = Reflect.apply(saved.coverage, this, args);
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
    };
    TestsStream.prototype.summary = function (...args) {
      const t = active,
        owning = t && this === t.root.reporter;
      let before;
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
      const valid = () =>
        t.state === 'COVERAGE_EMITTED' &&
        args[0] === t.root.nesting &&
        args[1] === t.root.loc?.file &&
        args[2] === true &&
        t.root.harness.success === true &&
        args[3] === t.root.harness.counters;
      if (owning)
        capture(() => {
          if (!valid()) throw new Error('foreign/failed summary');
          before = fields.map((k) => C.integer(args[3][k]));
        });
      let result;
      try {
        result = Reflect.apply(saved.streamSummary, this, args);
      } catch (error) {
        if (owning) fail();
        throw error;
      }
      if (owning)
        capture(() => {
          if (
            !before ||
            !valid() ||
            !fields.every((k, i) => args[3][k] === before[i])
          ) {
            throw new Error('summary counters changed');
          }
          t.state = 'SUMMARY_EMITTED';
        });
      return result;
    };
    Test.prototype.postRun = function (...args) {
      const qualifies =
        this.parent === null &&
        this.root === this &&
        this.harness &&
        this.config === this.harness.config &&
        this.config.isTestRunner === true &&
        this.config.setup === setup &&
        this.reporter instanceof TestsStream &&
        typeof this.harness.coverage === 'function';
      if (qualifies && (this.config.watch || this.harness.watching))
        watchSession = true;
      if (!qualifies || this.reported || watchSession)
        return Reflect.apply(saved.post, this, args);
      if (completed || active || (owner && owner !== this)) {
        fail();
        return Reflect.apply(saved.post, this, args);
      }
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- the owning reporter instance is tracked across calls
      owner = this;
      let t;
      capture(() => {
        if (
          fs.readFileSync(process.env.TETRIS_QA2_BINDING, 'utf8') !==
          String(process.pid)
        ) {
          throw new Error('foreign or missing expected PID');
        }
        const launch = Buffer.from(process.env.TETRIS_QA2_LAUNCH, 'hex');
        if (launch.length !== 16) throw new Error('launch binding');
        const entries = C.inventory(process.cwd());
        const writer = new C.Writer(
          process.env.TETRIS_QA2_DIRECTORY,
          launch,
          process.pid,
          randomBytes(16)
        );
        t = {
          root: this,
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
      if (!t) return Reflect.apply(saved.post, this, args);
      const harness = this.harness,
        original = harness.coverage;
      function wrapped(...coverageArgs) {
        if (t.state !== 'SELECTED') fail();
        t.state = 'COVERAGE_CALL';
        let result;
        try {
          result = Reflect.apply(original, this, coverageArgs);
        } catch (error) {
          fail();
          throw error;
        }
        capture(() => {
          if (t.state !== 'COVERAGE_CALL')
            throw new Error('incomplete owning coverage');
          publishSelected(t, result);
        });
        t.state = 'COVERAGE_RETURNED';
        return result;
      }
      active = t;
      harness.coverage = wrapped;
      let result;
      try {
        result = Reflect.apply(saved.post, this, args);
      } catch (error) {
        fail();
        throw error;
      } finally {
        if (harness.coverage === wrapped) harness.coverage = original;
        else fail();
        active = null;
      }
      completed = true;
      capture(() => {
        if (
          invalid ||
          watchSession ||
          t.state !== 'SUMMARY_EMITTED' ||
          this.config.watch ||
          harness.watching ||
          !harness.success
        )
          throw new Error('incomplete finite transaction');
        t.state = 'POSTRUN_RETURNED';
        const manifest = [
          t.entries.length,
          t.required.size,
          t.witnessCount,
          t.rowCount,
          ...t.totals,
          C.inventoryDigest(t.entries),
          t.witnessHash.digest(),
          t.rowHash.digest(),
          true,
          true,
          true,
          true,
          true
        ];
        t.writer.record(5, manifest);
        t.writer.record(6, [C.recordHash(5, manifest), t.writer.sequence]);
        t.state = 'SEALED';
      });
      return result;
    };
  } catch {
    fail();
  }
}
