// Reading the mp4 out of a GitHub Actions artifact ZIP.
//
// GitHub always wraps workflow-run artifacts in a ZIP, but the user must get
// a plain .mp4 with no ZIP anywhere in their path — so the browser has to
// extract it itself. upload-artifact (with compression-level: 0) writes a
// STREAMING archive: local file headers can carry zero sizes, with the real
// values deferred to a trailing data descriptor. A reader that trusts local
// headers extracts nothing. So sizes and offsets always come from the
// central directory, never from the local header — see
// tests/fixtures/streaming_artifact.zip, which is deliberately built as a
// genuine streaming ZIP (not one written by a normal zip tool) so a reader
// that took the shortcut would fail the test.
//
// ZIP64 is intentionally NOT supported: our artifacts are single video files
// well under the 4 GiB / 65535-entry limits that force ZIP64 fields. Rather
// than silently misreading the ZIP64 sentinel values (0xFFFF / 0xFFFFFFFF)
// as huge-but-real numbers, readCentralDirectory() throws — see
// assertNotZip64Sentinel below.

function zipView(bytes) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

var EOCD_SIGNATURE = 0x06054b50;
var CDH_SIGNATURE = 0x02014b50;

function findEocd(bytes) {
  var view = zipView(bytes);
  // The EOCD sits at the very end, followed by a comment of up to 65535 bytes.
  var earliest = Math.max(0, bytes.byteLength - 22 - 0xFFFF);
  for (var at = bytes.byteLength - 22; at >= earliest; at--) {
    if (view.getUint32(at, true) === EOCD_SIGNATURE) return at;
  }
  return -1;
}

// A ZIP64 archive stores 0xFFFF/0xFFFFFFFF sentinels in these 32-/16-bit
// fields to say "look at the ZIP64 extra record instead". We don't parse
// that record, so treating a sentinel as a literal value would silently
// yield a bogus (typically empty-looking) entry list. Fail loudly instead.
function assertNotZip64Sentinel(value, label) {
  if (value === 0xFFFF || value === 0xFFFFFFFF) {
    throw new Error(
      'burn_artifact: ZIP64 archive detected (' + label + ' is a ZIP64 ' +
      'sentinel); ZIP64 is not supported',
    );
  }
  return value;
}

function readCentralDirectory(bytes, eocdOffset) {
  if (eocdOffset < 0) return [];
  var view = zipView(bytes);
  var count = assertNotZip64Sentinel(
    view.getUint16(eocdOffset + 10, true), 'central directory entry count',
  );
  var at = assertNotZip64Sentinel(
    view.getUint32(eocdOffset + 16, true), 'central directory offset',
  );
  var entries = [];
  for (var i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== CDH_SIGNATURE) break;
    var nameLen = view.getUint16(at + 28, true);
    var extraLen = view.getUint16(at + 30, true);
    var commentLen = view.getUint16(at + 32, true);
    var nameBytes = bytes.slice(at + 46, at + 46 + nameLen);
    var name = '';
    for (var c = 0; c < nameBytes.length; c++) {
      name += String.fromCharCode(nameBytes[c]);
    }
    entries.push({
      // Artifact filenames are our own construction (burned__{talk_id}__
      // {video_slug}, ASCII only), so a UTF-8 decode of the raw name bytes
      // can never see malformed sequences in practice. Still, decodeURI-
      // Component(escape(name)) throws URIError on malformed input, which
      // would surface as an undiagnosable crash for the user. TextDecoder
      // never throws (it substitutes U+FFFD instead), so it's the safer
      // choice even though both give the same answer on our inputs.
      name: new TextDecoder('utf-8').decode(nameBytes),
      method: view.getUint16(at + 10, true),
      compressedSize: assertNotZip64Sentinel(
        view.getUint32(at + 20, true), 'entry compressed size',
      ),
      uncompressedSize: assertNotZip64Sentinel(
        view.getUint32(at + 24, true), 'entry uncompressed size',
      ),
      localHeaderOffset: assertNotZip64Sentinel(
        view.getUint32(at + 42, true), 'entry local header offset',
      ),
    });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function pickMp4Entry(entries) {
  var list = entries || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && /\.mp4$/i.test(String(list[i].name))) return list[i];
  }
  return null;
}

function localDataOffset(bytes, localHeaderOffset) {
  var view = zipView(bytes);
  var nameLen = view.getUint16(localHeaderOffset + 26, true);
  var extraLen = view.getUint16(localHeaderOffset + 28, true);
  return localHeaderOffset + 30 + nameLen + extraLen;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EOCD_SIGNATURE: EOCD_SIGNATURE,
    CDH_SIGNATURE: CDH_SIGNATURE,
    findEocd: findEocd,
    readCentralDirectory: readCentralDirectory,
    pickMp4Entry: pickMp4Entry,
    localDataOffset: localDataOffset,
  };
}
