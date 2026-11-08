'use strict';
// QA-2 evidence format. This module never runs a test or loads game code.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { StringDecoder } = require('node:string_decoder');
const { pathToFileURL, fileURLToPath } = require('node:url');
const HEADER = 128;
const PAYLOAD = 65536 - HEADER;
const ZERO = Buffer.alloc(32);
const COUNT_NAMES = [
  'totalLineCount',
  'coveredLineCount',
  'totalBranchCount',
  'coveredBranchCount',
  'totalFunctionCount',
  'coveredFunctionCount'
];
const SCHEMAS = {
  1: ['n', 's', 's', 's', 'n', 'b', 'b'],
  2: ['n', 's', 's', 'n', 'n', 'd', 'n', 'd'],
  3: ['n', 's', 's', 'n', 'd'],
  4: ['n', 's', 's', 'n', 'n', 'n', 'n', 'n', 'n'],
  5: [
    'n',
    'n',
    'n',
    'n',
    'n',
    'n',
    'n',
    'n',
    'n',
    'n',
    'd',
    'd',
    'd',
    'b',
    'b',
    'b',
    'b',
    'b'
  ],
  6: ['d', 'n']
};
function hash(value) {
  return createHash('sha256').update(value).digest();
}
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('unsafe nonnegative integer');
  return value;
}
function add(a, b) {
  return integer(integer(a) + integer(b));
}
function u64(value) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(integer(value)));
  return b;
}
function number(buffer) {
  if (buffer.length !== 8) throw new Error('invalid integer field');
  const n = buffer.readBigUInt64BE();
  if (n > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('unsafe encoded integer');
  return Number(n);
}
function* textBytes(text) {
  if (typeof text !== 'string') throw new Error('non-string text');
  // Each code unit is encoded independently. Surrogate boundaries cannot alter bytes.
  for (let i = 0; i < text.length; i += 16384) {
    const end = Math.min(i + 16384, text.length);
    const b = Buffer.alloc((end - i) * 2);
    for (let j = i; j < end; j++)
      b.writeUInt16LE(text.charCodeAt(j), (j - i) * 2);
    yield b;
  }
}
function textHash(parts) {
  const h = createHash('sha256');
  let units = 0;
  for (const part of parts) {
    if (typeof part !== 'string') throw new Error('missing native source text');
    units = add(units, part.length);
    for (const bytes of textBytes(part)) h.update(bytes);
  }
  return { units, digest: h.digest() };
}
function fieldLength(type, value) {
  if (type === 'n') {
    integer(value);
    return 8;
  }
  if (type === 'b') {
    if (typeof value !== 'boolean') throw new Error('invalid boolean');
    return 1;
  }
  if (type === 'd') {
    if (!Buffer.isBuffer(value) || value.length !== 32)
      throw new Error('invalid digest');
    return 32;
  }
  if (type === 's') {
    if (typeof value !== 'string') throw new Error('invalid text');
    return integer(value.length * 2);
  }
  throw new Error('unknown field');
}
function recordLength(kind, values) {
  const schema = SCHEMAS[kind];
  if (!schema || values.length !== schema.length)
    throw new Error('record schema mismatch');
  return schema.reduce(
    (n, type, i) => add(n, add(8, fieldLength(type, values[i]))),
    0
  );
}
function* encode(kind, values) {
  recordLength(kind, values);
  for (let i = 0; i < values.length; i++) {
    const type = SCHEMAS[kind][i],
      value = values[i];
    yield u64(fieldLength(type, value));
    if (type === 's') yield* textBytes(value);
    else if (type === 'n') yield u64(value);
    else if (type === 'b') yield Buffer.from([value ? 1 : 0]);
    else yield value;
  }
}
function updateCategory(h, kind, values) {
  h.update(u64(recordLength(kind, values)));
  for (const b of encode(kind, values)) h.update(b);
}
function recordHash(kind, values) {
  const h = createHash('sha256');
  for (const b of encode(kind, values)) h.update(b);
  return h.digest();
}
function canonical(p) {
  const absolute = path.resolve(p);
  if (fileURLToPath(pathToFileURL(absolute)) !== absolute)
    throw new Error('path URL roundtrip conflict');
  return fs.realpathSync.native(absolute);
}
function fileIdentity(filename) {
  const raw = createHash('sha256'),
    text = createHash('sha256'),
    decoder = new StringDecoder('utf8');
  let bytes = 0,
    units = 0;
  const fd = fs.openSync(
    filename,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
  );
  try {
    if (!fs.fstatSync(fd).isFile()) throw new Error('source is not regular');
    const buf = Buffer.alloc(65536);
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      bytes = add(bytes, n);
      raw.update(buf.subarray(0, n));
      const part = decoder.write(buf.subarray(0, n));
      units = add(units, part.length);
      for (const b of textBytes(part)) text.update(b);
    }
    const tail = decoder.end();
    units = add(units, tail.length);
    for (const b of textBytes(tail)) text.update(b);
    return { bytes, raw: raw.digest(), units, text: text.digest() };
  } finally {
    fs.closeSync(fd);
  }
}
function inventory(cwd) {
  const root = path.join(cwd, 'public', 'game');
  const rows = [],
    unknown = [];
  function walk(folder, relative) {
    if (
      !fs.lstatSync(folder).isDirectory() ||
      fs.lstatSync(folder).isSymbolicLink()
    )
      throw new Error('unknown source directory form');
    const names = fs.readdirSync(folder, {
      encoding: process.platform === 'win32' ? 'utf8' : 'buffer'
    });
    const decoded = names
      .map((name) => {
        if (typeof name === 'string') return name;
        const text = name.toString('utf8');
        if (!Buffer.from(text, 'utf8').equals(name))
          throw new Error('source name cannot roundtrip');
        return text;
      })
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const name of decoded) {
      const abs = path.join(folder, name),
        rel = path.join(relative, name),
        stat = fs.lstatSync(abs);
      if (stat.isSymbolicLink()) {
        unknown.push(`source-domain link: ${rel}`);
        continue;
      }
      if (stat.isDirectory()) {
        rows.push([rows.length, rel, canonical(abs), 2, 0, ZERO, 0, ZERO]);
        walk(abs, rel);
      } else if (
        stat.isFile() &&
        name.endsWith('.js') &&
        !/\.(?:test|spec)\.js$/.test(name)
      ) {
        const f = fileIdentity(abs);
        rows.push([
          rows.length,
          rel,
          canonical(abs),
          1,
          f.bytes,
          f.raw,
          f.units,
          f.text
        ]);
      } else unknown.push(`unknown source-domain entry: ${rel}`);
    }
  }
  walk(root, 'public/game');
  if (unknown.length) throw new Error(unknown.join('\n'));
  if (!rows.some((row) => row[3] === 1))
    throw new Error('no required game sources');
  return rows;
}
function inventoryDigest(rows) {
  const h = createHash('sha256');
  for (const row of rows) updateCategory(h, 2, row);
  return h.digest();
}
function counts(row) {
  const values = COUNT_NAMES.map((name) => integer(row[name]));
  for (let i = 0; i < 6; i += 2)
    if (values[i + 1] > values[i]) throw new Error('covered exceeds total');
  return values;
}
class Writer {
  constructor(directory, launch, pid, transaction) {
    this.directory = directory;
    this.launch = launch;
    this.pid = pid;
    this.transaction = transaction;
    this.sequence = 0;
    this.previous = ZERO;
    this.sealed = false;
  }
  frame(kind, payload, end) {
    if (this.sealed || payload.length > PAYLOAD)
      throw new Error('invalid publication state');
    const head = Buffer.alloc(HEADER);
    head.write('T329EV01', 0, 'ascii');
    this.launch.copy(head, 8);
    head.writeBigUInt64BE(BigInt(integer(this.pid)), 24);
    head.writeBigUInt64BE(BigInt(integer(this.sequence)), 32);
    head[40] = kind;
    head[41] = end ? 1 : 0;
    head.writeUInt32BE(payload.length, 44);
    this.previous.copy(head, 48);
    hash(payload).copy(head, 80);
    this.transaction.copy(head, 112);
    const bytes = Buffer.concat([head, payload]);
    const final = path.join(
      this.directory,
      this.sequence.toString(16).padStart(16, '0') + '.frame'
    );
    const stage = final + '.stage';
    const fd = fs.openSync(stage, 'wx', 0o600);
    try {
      let offset = 0;
      while (offset < bytes.length) {
        const n = fs.writeSync(fd, bytes, offset, bytes.length - offset);
        if (!n) throw new Error('short evidence write');
        offset += n;
      }
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(stage, final);
    this.previous = hash(bytes);
    this.sequence = add(this.sequence, 1);
  }
  record(kind, values) {
    let buffer = Buffer.alloc(PAYLOAD),
      used = 0;
    for (const part of encode(kind, values)) {
      let offset = 0;
      while (offset < part.length) {
        if (used === PAYLOAD) {
          this.frame(kind, buffer, false);
          buffer = Buffer.alloc(PAYLOAD);
          used = 0;
        }
        const n = Math.min(PAYLOAD - used, part.length - offset);
        part.copy(buffer, used, offset, offset + n);
        used += n;
        offset += n;
      }
    }
    this.frame(kind, buffer.subarray(0, used), true);
    if (kind === 6) this.sealed = true;
  }
}
// Incremental field reader: only identity strings, not source text, are retained.
class Decoder {
  constructor(kind) {
    this.schema = SCHEMAS[kind];
    if (!this.schema) throw new Error('unknown kind');
    this.values = [];
    this.prefix = Buffer.alloc(8);
    this.prefixUsed = 0;
    this.remaining = null;
    this.parts = [];
  }
  push(bytes) {
    let offset = 0;
    while (offset < bytes.length) {
      if (this.values.length >= this.schema.length)
        throw new Error('trailing record data');
      if (this.remaining === null) {
        const n = Math.min(8 - this.prefixUsed, bytes.length - offset);
        bytes.copy(this.prefix, this.prefixUsed, offset, offset + n);
        this.prefixUsed += n;
        offset += n;
        if (this.prefixUsed !== 8) continue;
        this.remaining = number(this.prefix);
        this.prefixUsed = 0;
        this.parts = [];
        const type = this.schema[this.values.length];
        if (
          (type === 's' && this.remaining % 2) ||
          (type === 'n' && this.remaining !== 8) ||
          (type === 'b' && this.remaining !== 1) ||
          (type === 'd' && this.remaining !== 32)
        )
          throw new Error('field length mismatch');
        if (this.remaining === 0) this.finish();
      } else {
        const n = Math.min(this.remaining, bytes.length - offset);
        this.parts.push(Buffer.from(bytes.subarray(offset, offset + n)));
        offset += n;
        this.remaining -= n;
        if (this.remaining === 0) this.finish();
      }
    }
  }
  finish() {
    const b = Buffer.concat(this.parts),
      type = this.schema[this.values.length];
    let value;
    if (type === 's') value = b.toString('utf16le');
    else if (type === 'n') value = number(b);
    else if (type === 'b') {
      if (b[0] > 1) throw new Error('invalid boolean byte');
      value = b[0] === 1;
    } else value = b;
    this.values.push(value);
    this.remaining = null;
    this.parts = [];
  }
  end() {
    if (
      this.remaining !== null ||
      this.prefixUsed ||
      this.values.length !== this.schema.length
    )
      throw new Error('incomplete record');
    return this.values;
  }
}
function readEvidence(directory, launch, pid, accept) {
  let sequence = 0,
    previous = ZERO,
    transaction = null,
    decoder = null,
    kind = null,
    sealed = false;
  while (!sealed) {
    const filename = path.join(
      directory,
      sequence.toString(16).padStart(16, '0') + '.frame'
    );
    const fd = fs.openSync(
      filename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
    );
    let bytes;
    try {
      const st = fs.fstatSync(fd);
      if (!st.isFile() || st.size < HEADER || st.size > 65536)
        throw new Error('invalid evidence frame size/type');
      bytes = Buffer.alloc(st.size);
      let offset = 0;
      while (offset < bytes.length) {
        const n = fs.readSync(fd, bytes, offset, bytes.length - offset, null);
        if (!n) throw new Error('truncated frame');
        offset += n;
      }
    } finally {
      fs.closeSync(fd);
    }
    const h = bytes.subarray(0, HEADER),
      payload = bytes.subarray(HEADER);
    if (
      h.toString('ascii', 0, 8) !== 'T329EV01' ||
      !h.subarray(8, 24).equals(launch) ||
      number(h.subarray(24, 32)) !== pid ||
      number(h.subarray(32, 40)) !== sequence ||
      h[41] > 1 ||
      h[42] ||
      h[43] ||
      h.readUInt32BE(44) !== payload.length ||
      !h.subarray(48, 80).equals(previous) ||
      !h.subarray(80, 112).equals(hash(payload))
    ) {
      throw new Error('frame binding/chain mismatch');
    }
    if (!transaction) transaction = Buffer.from(h.subarray(112));
    if (!transaction.equals(h.subarray(112)))
      throw new Error('foreign root transaction');
    if (!decoder) {
      kind = h[40];
      decoder = new Decoder(kind);
    }
    if (kind !== h[40]) throw new Error('interleaved logical record');
    decoder.push(payload);
    previous = hash(bytes);
    if (h[41]) {
      const values = decoder.end();
      accept(kind, values, sequence);
      sealed = kind === 6;
      decoder = null;
    }
    sequence = add(sequence, 1);
  }
  let entries = 0;
  const dir = fs.opendirSync(directory);
  try {
    for (let entry; (entry = dir.readSync()) !== null;) {
      if (
        !entry.isFile() ||
        !/^[0-9a-f]{16}\.frame$/.test(entry.name) ||
        BigInt('0x' + entry.name.slice(0, 16)) >= BigInt(sequence)
      ) {
        throw new Error('unknown/orphan/later evidence entry');
      }
      entries = add(entries, 1);
    }
  } finally {
    dir.closeSync();
  }
  if (entries !== sequence) throw new Error('evidence entry count mismatch');
}
module.exports = {
  fileIdentity,
  ZERO,
  integer,
  add,
  textHash,
  canonical,
  inventory,
  inventoryDigest,
  counts,
  Writer,
  Decoder,
  readEvidence,
  updateCategory,
  recordHash
};
