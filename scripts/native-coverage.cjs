'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const C = require('./native-coverage-common.cjs');

// Independently reconstruct membership, counts and digests. Producer assertions
// are evidence to check, not the supervisor's acceptance decision.
function validate(directory, launch, pid, baseline) {
  const expectedInventory = C.inventoryDigest(baseline);
  const required = new Map(
    baseline.filter((r) => r[3] === 1).map((r) => [r[2], r])
  );
  const witnesses = new Map(),
    seen = new Set(),
    totals = [0, 0, 0, 0, 0, 0];
  const ih = createHash('sha256'),
    wh = createHash('sha256'),
    rh = createHash('sha256');
  let begun = false,
    inventoryCount = 0,
    witnessCount = 0,
    rowCount = 0;
  let manifest = null,
    phase = 0;
  C.readEvidence(directory, launch, pid, (kind, row, sequence) => {
    if (kind === 1) {
      if (
        begun ||
        sequence !== 0 ||
        row[0] !== 1 ||
        row[1] !== process.version ||
        row[2] !== process.platform ||
        row[3] !== process.arch ||
        row[4] !== pid ||
        row[5] !== true ||
        row[6] !== false
      )
        throw new Error('invalid finite owner');
      begun = true;
      phase = 1;
      return;
    }
    if (!begun) throw new Error('missing begin');
    if (kind === 2) {
      if (phase !== 1 || row[0] !== inventoryCount)
        throw new Error('inventory order');
      C.updateCategory(ih, 2, row);
      inventoryCount = C.add(inventoryCount, 1);
      return;
    }
    if (kind === 3) {
      if (phase > 2 || row[0] !== witnessCount)
        throw new Error('witness order');
      phase = 2;
      const old = witnesses.get(row[1]);
      if (
        old &&
        (old[2] !== row[2] || old[3] !== row[3] || !old[4].equals(row[4]))
      ) {
        throw new Error('contradictory witness');
      }
      witnesses.set(row[1], row);
      C.updateCategory(wh, 3, row);
      witnessCount = C.add(witnessCount, 1);
      return;
    }
    if (kind === 4) {
      if (phase > 3 || row[0] !== rowCount) throw new Error('row order');
      phase = 3;
      const witness = witnesses.get(pathToFileURL(row[1]).href);
      if (!witness || witness[2] !== row[2])
        throw new Error('unwitnessed native row');
      const source = required.get(row[2]);
      if (source) {
        if (source[6] !== witness[3] || !source[7].equals(witness[4])) {
          throw new Error('source text mismatch');
        }
        seen.add(row[2]);
      }
      for (let i = 0; i < 6; i += 2) {
        if (row[i + 3] !== row[i + 4])
          throw new Error('coverage below exact 100%');
        totals[i] = C.add(totals[i], row[i + 3]);
        totals[i + 1] = C.add(totals[i + 1], row[i + 4]);
      }
      C.updateCategory(rh, 4, row);
      rowCount = C.add(rowCount, 1);
      return;
    }
    if (kind === 5) {
      if (
        phase > 3 ||
        manifest ||
        seen.size !== required.size ||
        inventoryCount !== baseline.length
      ) {
        throw new Error('incomplete manifest membership');
      }
      phase = 4;
      const expected = [
        inventoryCount,
        required.size,
        witnessCount,
        rowCount,
        ...totals,
        ih.digest(),
        wh.digest(),
        rh.digest(),
        true,
        true,
        true,
        true,
        true
      ];
      if (
        !expected.every((v, i) =>
          Buffer.isBuffer(v) ? v.equals(row[i]) : v === row[i]
        ) ||
        !row[10].equals(expectedInventory)
      )
        throw new Error('manifest mismatch');
      manifest = row;
      return;
    }
    if (kind === 6) {
      if (
        phase !== 4 ||
        !manifest ||
        !row[0].equals(C.recordHash(5, manifest)) ||
        row[1] !== sequence
      ) {
        throw new Error('invalid terminal seal');
      }
      phase = 5;
      return;
    }
    throw new Error('unknown evidence record');
  });
  if (phase !== 5) throw new Error('missing sealed transaction');
}

function main() {
  const cwd = process.cwd(),
    launch = randomBytes(16);
  let baseline, directory, container;
  function cleanup() {
    try {
      if (container) fs.rmSync(container, { recursive: true, force: true });
      return true;
    } catch (error) {
      console.error('QA-2 evidence cleanup failed:', error.message);
      return false;
    }
  }
  try {
    baseline = C.inventory(cwd);
    container = fs.mkdtempSync(path.join(os.tmpdir(), 'tetris-qa2-'));
    fs.chmodSync(container, 0o700);
    directory = path.join(container, 'evidence');
    fs.mkdirSync(directory, { mode: 0o700 });
  } catch (error) {
    console.error('QA-2 verification unavailable:', error.message);
    cleanup();
    process.exitCode = 1;
    return;
  }
  const observer = path.join(__dirname, 'native-coverage-observer.cjs');
  const env = {
    ...process.env,
    TETRIS_QA2_LAUNCH: launch.toString('hex'),
    TETRIS_QA2_DIRECTORY: directory,
    TETRIS_QA2_PARENT: String(process.pid),
    TETRIS_QA2_BINDING: path.join(container, 'owner-pid')
  };
  let child;
  try {
    child = spawn(
      process.execPath,
      ['--expose-internals', '--require', observer, ...process.argv.slice(2)],
      { cwd, env, shell: false, detached: false, stdio: 'inherit' }
    );
  } catch (error) {
    console.error('QA-2 child launch unavailable:', error.message);
    cleanup();
    process.exitCode = 1;
    return;
  }
  let bindingError = null;
  try {
    if (!Number.isSafeInteger(child.pid)) throw new Error('missing child PID');
    fs.writeFileSync(env.TETRIS_QA2_BINDING, String(child.pid), {
      flag: 'wx',
      mode: 0o600
    });
  } catch (error) {
    bindingError = error;
    console.error('QA-2 PID binding unavailable:', error.message);
  }
  let interrupted = false,
    exited = false,
    closed = false,
    spawnError = null,
    forced = false;
  const timers = [];
  const running = () =>
    !exited && !closed && child.exitCode === null && child.signalCode === null;
  const timer = (fn, ms) => {
    timers.push(setTimeout(fn, ms));
  };
  function signal(name) {
    if (!running()) return;
    try {
      if (!child.kill(name))
        spawnError ||= new Error('child signal delivery refused');
    } catch (error) {
      spawnError ||= error;
    }
  }
  function force() {
    if (forced || !running()) return;
    forced = true;
    signal('SIGKILL');
  }
  function finishMissing() {
    if (closed) return;
    console.error(
      'QA-2 incomplete cleanup: direct child close missing; descendant cleanup unverified.'
    );
    cleanup();
    process.exit(1);
  }
  function interrupt(name) {
    if (interrupted) {
      force();
      return;
    }
    interrupted = true;
    if (process.platform === 'win32') {
      force();
      timer(finishMissing, 5000);
    } else {
      timer(() => {
        if (!forced) signal(name);
      }, 250);
      timer(force, 5000);
      timer(finishMissing, 10000);
    }
  }
  const onInt = () => {
      interrupt('SIGINT');
    },
    onTerm = () => {
      interrupt('SIGTERM');
    };
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  child.on('error', (error) => {
    spawnError = error;
  });
  child.on('exit', () => {
    exited = true;
  });
  child.on('close', (code, signalName) => {
    closed = true;
    for (const t of timers) clearTimeout(t);
    let valid = false;
    try {
      if (bindingError) throw bindingError;
      if (spawnError) throw spawnError;
      if (interrupted || forced || signalName || code !== 0) {
        throw new Error('native run unsuccessful or interrupted');
      }
      validate(directory, launch, child.pid, baseline);
      if (
        !C.inventoryDigest(C.inventory(cwd)).equals(C.inventoryDigest(baseline))
      ) {
        throw new Error('source inventory changed');
      }
      valid = true;
    } catch (error) {
      console.error('QA-2 acceptance not established:', error.message);
    }
    const cleaned = cleanup();
    // Optional, explicitly scoped diagnostic evidence. Never substitutes for gate checks.
    let telemetryWritten = true;
    if (process.env.TETRIS_QA2_SUBRUN_STATUS) {
      try {
        fs.writeFileSync(
          process.env.TETRIS_QA2_SUBRUN_STATUS,
          JSON.stringify({
            native: {
              pid: child.pid,
              code,
              signal: signalName,
              spawnError: spawnError?.message ?? null
            },
            observer: {
              valid,
              interrupted,
              forced,
              bindingError: bindingError?.message ?? null
            },
            cleanup: {
              privateEvidenceRemoved: cleaned,
              descendantContainment: 'not claimed'
            }
          }) + '\n',
          { flag: 'wx', mode: 0o600 }
        );
      } catch (error) {
        telemetryWritten = false;
        console.error('QA-2 requested telemetry unavailable:', error.message);
      }
    }
    process.removeListener('SIGINT', onInt);
    process.removeListener('SIGTERM', onTerm);
    if (valid && cleaned && telemetryWritten) {
      console.log(
        'QA-2: owning finite coverage includes every required game source at exact 100%.'
      );
      process.exitCode = 0;
      return;
    }
    if (signalName && process.platform !== 'win32' && cleaned) {
      try {
        process.kill(process.pid, signalName);
        setImmediate(() => {
          console.error(
            'QA-2 signal disposition did not terminate supervisor:',
            signalName
          );
          process.exit(1);
        });
      } catch (error) {
        console.error('QA-2 signal disposition unavailable:', error.message);
        process.exitCode = 1;
      }
      return;
    }
    process.exitCode = Number.isInteger(code) && code !== 0 ? code : 1;
  });
}
if (require.main === module) main();
module.exports = { validate };
