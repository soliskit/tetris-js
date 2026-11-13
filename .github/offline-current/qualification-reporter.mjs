// Simplified evidence design: no frozen roster file. Expectations come from
// the tracked skips file and the plain required-screenshots list; the roster
// fingerprint is computed from this run's own planned list.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const key = (record) =>
  JSON.stringify([record.project, record.file, record.titles]);
const rosterDigest = (identities) =>
  createHash('sha256')
    .update(JSON.stringify([...identities].sort()))
    .digest('hex');
function skipIdentities() {
  const result = new Set();
  for (const line of fs
    .readFileSync('.github/expected-browser-skips.txt', 'utf8')
    .split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split(' › ');
    if (
      parts.length < 3 ||
      !parts[0].startsWith('[') ||
      !parts[0].endsWith(']')
    )
      throw new Error('unparseable skips line: ' + line);
    result.add(
      key({
        project: parts[0].slice(1, -1),
        file: parts[1],
        titles: parts.slice(2)
      })
    );
  }
  return result;
}
export default class QualificationReporter {
  constructor() {
    this.records = new Map();
    this.errors = [];
    this.kind = process.env.QUALIFICATION_SUITE;
    this.root = process.env.QUALIFICATION_EVIDENCE;
    if (!['source', 'delivery'].includes(this.kind) || !this.root)
      throw new Error('explicit suite and evidence directory required');
    this.skips = skipIdentities();
    const expectedFailures = JSON.parse(
      fs.readFileSync('.github/expected-browser-failures.json', 'utf8')
    );
    if (expectedFailures.schema !== 1 || expectedFailures.failures.length !== 1)
      throw new Error('expected failure identities changed');
    this.expectedFailures = new Set(expectedFailures.failures.map(key));
    const required = JSON.parse(
      fs.readFileSync(
        '.github/offline-current/required-screenshots.json',
        'utf8'
      )
    );
    if (required.schema !== 1 || required.screenshots.length !== 12)
      throw new Error('invalid required screenshots document');
    this.requiredScreenshots = required.screenshots;
    this.directory = path.join(this.root, this.kind);
    fs.mkdirSync(this.directory, { recursive: false });
    this.head = process.env.QUALIFICATION_HEAD;
    this.run = process.env.GITHUB_RUN_ID;
    this.attempt = process.env.GITHUB_RUN_ATTEMPT;
    if (
      !/^[a-f0-9]{40}$/.test(this.head || '') ||
      !/^\d+$/.test(this.run || '') ||
      !/^[1-9]\d*$/.test(this.attempt || '') ||
      (process.env.QUALIFICATION_SOURCE_MODE && this.attempt !== '1')
    )
      throw new Error(
        'exact head, run and valid attempt required; qualification is first attempt only'
      );
  }
  fields(test) {
    const [, project, , ...titles] = test.titlePath();
    const file = path
      .relative(process.cwd(), test.location.file)
      .split(path.sep)
      .join('/');
    return { project, file, titles };
  }
  expectation(identity) {
    return this.skips.has(identity)
      ? 'skipped'
      : this.expectedFailures.has(identity)
        ? 'failed'
        : 'passed';
  }
  write(state, extra = {}) {
    const data = {
      schema: 2,
      suite: this.kind,
      state,
      rosterSha256: this.rosterSha256 || null,
      head: this.head,
      run: this.run,
      attempt: this.attempt,
      errors: this.errors,
      planned: this.planned || [],
      tests: [...this.records.values()],
      ...extra
    };
    const temporary = path.join(this.directory, 'report.json.tmp');
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', {
      flag: 'wx'
    });
    fs.renameSync(temporary, path.join(this.directory, 'report.json'));
  }
  onBegin(config, suite) {
    if (config.projects.some((project) => project.retries !== 0))
      this.errors.push('nonzero project retry configuration');
    this.planned = suite.allTests().map((test) => this.fields(test));
    const plannedKeys = this.planned.map(key);
    if (new Set(plannedKeys).size !== plannedKeys.length)
      this.errors.push('duplicate planned identity');
    this.rosterSha256 = rosterDigest(plannedKeys);
    for (const test of suite.allTests()) {
      if (this.records.has(test.id))
        this.errors.push('duplicate planned test ID');
      this.records.set(test.id, {
        id: test.id,
        ...this.fields(test),
        results: [],
        outcome: 'not-started'
      });
    }
    this.write('planned');
  }
  onError(error) {
    this.errors.push(error.stack || error.message || String(error));
    this.write('running');
  }
  onTestEnd(test, result) {
    const record = this.records.get(test.id);
    if (!record || key(record) !== key(this.fields(test)))
      throw new Error('unplanned or changed test identity');
    const attachments = [];
    for (const attachment of result.attachments) {
      const bytes = attachment.path
        ? (() => {
            const stat = fs.lstatSync(attachment.path);
            if (
              !stat.isFile() ||
              stat.isSymbolicLink() ||
              stat.size > 8 * 1024 * 1024
            )
              throw new Error('nonregular or oversized attachment');
            return fs.readFileSync(attachment.path);
          })()
        : attachment.body;
      if (!bytes || bytes.length > 8 * 1024 * 1024)
        throw new Error('missing or oversized attachment bytes');
      const digest = createHash('sha256').update(bytes).digest('hex');
      const name =
        digest + (attachment.contentType === 'image/png' ? '.png' : '.bin');
      const target = path.join(this.directory, name);
      if (!fs.existsSync(target))
        fs.writeFileSync(target, bytes, { flag: 'wx' });
      attachments.push({
        name: attachment.name,
        contentType: attachment.contentType,
        file: name,
        bytes: bytes.length,
        sha256: digest
      });
    }
    record.results.push({
      status: result.status,
      retry: result.retry,
      duration: result.duration,
      expectedStatus: test.expectedStatus,
      errors: result.errors.map(
        (error) => error.stack || error.message || String(error)
      ),
      attachments
    });
    record.outcome = test.outcome();
    this.write('running');
  }
  async onEnd(result) {
    const records = [...this.records.values()];
    const plannedKeys = new Set(this.planned.map(key));
    if (
      records.length !== this.planned.length ||
      records.some((record) => !plannedKeys.has(key(record)))
    )
      this.errors.push('full completed identity roster differs');
    for (const record of records) {
      const identity = key(record);
      if (record.results.length !== 1) {
        this.errors.push(
          'missing or duplicate completed identity: ' + identity
        );
        continue;
      }
      const last = record.results[0];
      const expected = this.expectation(identity);
      if (
        last.retry !== 0 ||
        last.status !== expected ||
        last.expectedStatus !== expected ||
        (expected !== 'failed' && last.errors.length) ||
        record.outcome !== (expected === 'skipped' ? 'skipped' : 'expected')
      )
        this.errors.push(
          'result differs from tracked skips-file expectation: ' + identity
        );
      if (this.kind === 'delivery') {
        const png = last.attachments.filter(
          (attachment) =>
            attachment.contentType === 'image/png' ||
            ['built-offline', 'persistent-offline'].includes(attachment.name)
        );
        const intended = this.requiredScreenshots.filter(
          (item) => key(item) === identity
        );
        if (
          intended.length > 1 ||
          png.length !== intended.length ||
          (intended.length === 1 &&
            (last.status !== 'passed' ||
              png[0].contentType !== 'image/png' ||
              png[0].name !== intended[0].name))
        )
          this.errors.push(
            'exact test screenshot assignment differs: ' + identity
          );
      }
    }
    if (this.kind === 'source') {
      const skipped = new Set(
        records
          .filter((record) => record.results[0]?.status === 'skipped')
          .map(key)
      );
      if (
        skipped.size !== this.skips.size ||
        [...skipped].some((identity) => !this.skips.has(identity))
      )
        this.errors.push('skipped identities differ from tracked skips file');
    }
    if (this.kind === 'delivery' && this.requiredScreenshots.length !== 12)
      this.errors.push('required screenshot document changed shape');
    if (result.status !== 'passed')
      this.errors.push('native reporter result not passed');
    this.write(this.errors.length ? 'incomplete' : 'complete', {
      nativeStatus: result.status,
      counts: {
        planned: records.length,
        passed: records.filter(
          (record) => record.results[0]?.status === 'passed'
        ).length,
        expectedFailed: records.filter(
          (record) =>
            record.results[0]?.status === 'failed' &&
            record.results[0]?.expectedStatus === 'failed' &&
            record.outcome === 'expected'
        ).length,
        expected: records.filter((record) => record.outcome === 'expected')
          .length,
        skipped: records.filter(
          (record) => record.results[0]?.status === 'skipped'
        ).length
      }
    });
    return { status: this.errors.length ? 'failed' : 'passed' };
  }
}
