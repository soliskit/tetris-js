// Merges the browser coverage recorded by the Chromium tests into one
// report for public/script.js, prints it, writes an HTML report to
// coverage/browser-report/ and fails when coverage is below the threshold.

import fs from 'node:fs';
import path from 'node:path';
import libCoverage from 'istanbul-lib-coverage';
import { createRequire } from 'node:module';
import v8ToIstanbul from 'v8-to-istanbul';

export const THRESHOLD = 100;

const root = path.resolve('.');
const sourceFile = path.join(root, 'public/script.js');
const coverageDir = path.join(root, 'coverage/browser');

const files = fs.existsSync(coverageDir)
  ? fs.readdirSync(coverageDir).filter((file) => file.endsWith('.json'))
  : [];
if (files.length === 0) {
  console.error(
    'No browser coverage found. Run the browser tests first: npm run test:e2e'
  );
  process.exit(1);
}

const map = libCoverage.createCoverageMap({});
const source = fs.readFileSync(sourceFile, 'utf8');
// Validate all records first: a malformed record must not disappear beside
// a valid measurement, and an empty entry must not reach converter defaults.
/** @typedef {Parameters<ReturnType<typeof v8ToIstanbul>['applyCoverage']>[0]} Functions */
/** @type {Functions[]} */
const applicable = [];
/** @returns {never} */
function invalid() {
  throw new Error('Invalid browser coverage input');
}
/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const object = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
/**
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
const list = (value) => Array.isArray(value);
for (const file of files) {
  /** @type {unknown} */
  const entries = JSON.parse(
    fs.readFileSync(path.join(coverageDir, file), 'utf8')
  );
  if (!list(entries)) invalid();
  for (const entry of entries) {
    if (!object(entry) || !list(entry.functions)) invalid();
    let measured = false;
    /** @type {Functions[number][]} */
    const functions = [];
    for (const fn of entry.functions) {
      if (
        !object(fn) ||
        !list(fn.ranges) ||
        typeof fn.isBlockCoverage !== 'boolean' ||
        (fn.functionName !== undefined && typeof fn.functionName !== 'string')
      )
        invalid();
      /** @type {Functions[number]['ranges'][number][]} */
      const ranges = [];
      for (const range of fn.ranges) {
        if (
          !object(range) ||
          typeof range.startOffset !== 'number' ||
          typeof range.endOffset !== 'number' ||
          typeof range.count !== 'number' ||
          !Number.isSafeInteger(range.startOffset) ||
          !Number.isSafeInteger(range.endOffset) ||
          !Number.isSafeInteger(range.count) ||
          range.startOffset < 0 ||
          range.endOffset < range.startOffset ||
          range.count < 0
        )
          invalid();
        if (Math.min(range.endOffset, source.length) > range.startOffset)
          measured = true;
        ranges.push({
          startOffset: range.startOffset,
          endOffset: range.endOffset,
          count: range.count
        });
      }
      functions.push({
        functionName: fn.functionName ?? '',
        isBlockCoverage: fn.isBlockCoverage,
        ranges
      });
    }
    if (measured) applicable.push(functions);
  }
}
if (applicable.length === 0) {
  console.error('No browser coverage of public/script.js was measured.');
  process.exit(1);
}
for (const functions of applicable) {
  const converter = v8ToIstanbul(sourceFile, 0, { source });
  await converter.load();
  converter.applyCoverage(functions);
  map.merge(converter.toIstanbul());
}

// istanbul-lib-report and istanbul-reports ship no types and none are added,
// so they load as unknown and each value is checked before it is used.
const requireFromHere = createRequire(import.meta.url);
/** @type {unknown} */
const libReport = requireFromHere('istanbul-lib-report');
/** @type {unknown} */
const reports = requireFromHere('istanbul-reports');

/**
 * Calls a function member with its owner as receiver; throws when the member
 * is missing or not a function.
 * @param {unknown} owner
 * @param {string} name
 * @param {unknown[]} args
 * @returns {unknown}
 */
function callMember(owner, name, args) {
  if (
    (typeof owner !== 'object' && typeof owner !== 'function') ||
    owner === null
  )
    throw new Error(`browser coverage: ${name} owner is not an object`);
  /** @type {unknown} */
  const member = Reflect.get(owner, name);
  if (typeof member !== 'function')
    throw new Error(`browser coverage: ${name} is not a function`);
  /** @type {unknown} */
  const result = Reflect.apply(member, owner, args);
  return result;
}

const context = callMember(libReport, 'createContext', [
  {
    dir: path.join(root, 'coverage/browser-report'),
    coverageMap: map
  }
]);
callMember(callMember(reports, 'create', ['text']), 'execute', [context]);
callMember(callMember(reports, 'create', ['html']), 'execute', [context]);

const summary = map.getCoverageSummary();
/** @type {Array<'lines' | 'branches' | 'functions'>} */
const kinds = ['lines', 'branches', 'functions'];
const failures = kinds
  .filter((kind) => summary[kind].pct < THRESHOLD)
  .map((kind) => `${kind} ${String(summary[kind].pct)}%`);
if (failures.length > 0) {
  console.error(
    `Browser coverage of public/script.js is below ${String(THRESHOLD)}%: ${failures.join(', ')}`
  );
  process.exit(1);
}
console.log(
  `Browser coverage of public/script.js: ${String(THRESHOLD)}% of lines, branches and functions.`
);
