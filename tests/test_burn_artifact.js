// Tests for site/js/burn_artifact.js — reading the mp4 out of a streaming
// Actions artifact ZIP (upload-artifact writes local headers with zero sizes
// and defers the real values to a trailing data descriptor; the central
// directory is the only place the real sizes and offsets live).

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const {
  EOCD_SIGNATURE,
  CDH_SIGNATURE,
  findEocd,
  readCentralDirectory,
  pickMp4Entry,
  localDataOffset,
} = require('../site/js/burn_artifact');

function fixture() {
  return new Uint8Array(fs.readFileSync('tests/fixtures/streaming_artifact.zip'));
}

describe('ZIP signatures', () => {
  it('pins the EOCD and central-directory-header magic numbers', () => {
    assert.strictEqual(EOCD_SIGNATURE, 0x06054b50);
    assert.strictEqual(CDH_SIGNATURE, 0x02014b50);
  });
});

describe('findEocd', () => {
  it('locates the end-of-central-directory record', () => {
    const bytes = fixture();
    const at = findEocd(bytes);
    assert.ok(at > 0);
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    assert.strictEqual(view.getUint32(at, true), 0x06054b50);
  });

  it('returns -1 when there is no EOCD', () => {
    assert.strictEqual(findEocd(new Uint8Array(64)), -1);
  });
});

describe('readCentralDirectory', () => {
  it('lists every entry with real sizes despite zeroed local headers', () => {
    const bytes = fixture();
    const entries = readCentralDirectory(bytes, findEocd(bytes));
    assert.strictEqual(entries.length, 2);
    const mp4 = entries.find((e) => e.name.endsWith('.mp4'));
    // The whole point: the local header said 0, the central directory knows.
    assert.ok(mp4.uncompressedSize > 0);
    assert.strictEqual(mp4.uncompressedSize, 140);
    assert.strictEqual(mp4.method, 0, 'compression-level 0 must yield STORED');
  });

  it('returns an empty list when the EOCD offset is invalid', () => {
    assert.deepStrictEqual(readCentralDirectory(fixture(), -1), []);
  });

  it('fails loudly on a ZIP64 entry-count sentinel instead of returning a bogus list', () => {
    // A minimal, hand-built EOCD record (22 bytes) with the entry-count
    // field set to the ZIP64 sentinel (0xFFFF), as a real >65535-entry
    // archive would have. This is not a real ZIP64 archive — just enough
    // bytes to prove the guard fires on the sentinel rather than silently
    // treating it as "65535 entries".
    const eocd = new Uint8Array(22);
    new DataView(eocd.buffer).setUint32(0, EOCD_SIGNATURE, true);
    new DataView(eocd.buffer).setUint16(10, 0xFFFF, true); // entry count
    assert.throws(() => readCentralDirectory(eocd, 0), /ZIP64/);
  });
});

describe('pickMp4Entry', () => {
  it('picks the mp4 and ignores other files', () => {
    const bytes = fixture();
    const entries = readCentralDirectory(bytes, findEocd(bytes));
    assert.ok(pickMp4Entry(entries).name.endsWith('.mp4'));
  });

  it('returns null when the archive holds no mp4', () => {
    assert.strictEqual(pickMp4Entry([{ name: 'a.txt' }]), null);
  });

  it('returns null for an empty entry list', () => {
    assert.strictEqual(pickMp4Entry([]), null);
  });
});

describe('localDataOffset', () => {
  it('skips the local header, name and extra field', () => {
    const bytes = fixture();
    const entries = readCentralDirectory(bytes, findEocd(bytes));
    const mp4 = pickMp4Entry(entries);
    const at = localDataOffset(bytes, mp4.localHeaderOffset);
    const payload = bytes.slice(at, at + mp4.uncompressedSize);
    // ftyp box marker proves we landed exactly on the file data.
    assert.strictEqual(
      Buffer.from(payload.slice(4, 8)).toString('latin1'), 'ftyp',
    );
  });
});
