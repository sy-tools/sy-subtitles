// A transcript file as the review page reads it and writes it back, and the
// compact timecode its rows are labelled with (site/js/transcript_text.js).
const { describe, it } = require('node:test');
const assert = require('node:assert');

const { parseTranscript, serializeTranscript, msToTC } = require('../site/js/transcript_text');

describe('parseTranscript / serializeTranscript', () => {
  var HEADER_LINE = 'Мова промови: англійська';

  it('parse+serialize is lossless for single-newline separator', () => {
    var src = 'Title\n' + HEADER_LINE + '\n\nПерший абзац.\nДругий абзац.\nТретій абзац.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.paragraphs.length, 3);
    assert.strictEqual(parsed.separator, '\n');
    assert.strictEqual(parsed.header, 'Title\n' + HEADER_LINE);
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('parse+serialize is lossless for double-newline separator', () => {
    var src = HEADER_LINE + '\n\nПерший.\n\nДругий.\n\nТретій.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.paragraphs.length, 3);
    assert.strictEqual(parsed.separator, '\n\n');
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('strips UTF-8 BOM defensively', () => {
    var src = '\uFEFF' + HEADER_LINE + '\n\nПерший абзац.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.header, HEADER_LINE, 'BOM should be stripped from header');
    assert.strictEqual(parsed.paragraphs[0], 'Перший абзац.');
  });

  it('preserves CRLF line endings on round-trip', () => {
    var src = HEADER_LINE + '\r\n\r\nПерший.\r\nДругий.\r\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.lineEnding, '\r\n');
    assert.strictEqual(parsed.paragraphs.length, 2);
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('edits round-trip with byte-identical unchanged paragraphs', () => {
    var src = HEADER_LINE + '\n\nПерший.\nДругий.\nТретій.\n';
    var parsed = parseTranscript(src);
    var paras = parsed.paragraphs.slice();
    paras[1] = 'Відредаговане.';
    var rebuilt = serializeTranscript(parsed, paras);
    assert.strictEqual(
      rebuilt,
      HEADER_LINE + '\n\nПерший.\nВідредаговане.\nТретій.\n'
    );
  });

  it('file with no header line treats all content as body', () => {
    var src = 'Перший.\nДругий.\nТретій.\n';
    var parsed = parseTranscript(src);
    assert.strictEqual(parsed.header, '');
    assert.strictEqual(parsed.paragraphs.length, 3);
    var rebuilt = serializeTranscript(parsed, parsed.paragraphs);
    assert.strictEqual(rebuilt, src);
  });

  it('consumes blank lines between header and body', () => {
    var src = HEADER_LINE + '\n\n\n\nПерший.\n';
    var parsed = parseTranscript(src);
    // body_start advances past all blank lines; first paragraph is the real content
    assert.strictEqual(parsed.paragraphs[0], 'Перший.');
  });
});

describe('msToTC', () => {
  it('writes minutes and seconds, zero-padded', () => {
    assert.strictEqual(msToTC(0), '00:00');
    assert.strictEqual(msToTC(1000), '00:01');
    assert.strictEqual(msToTC(61000), '01:01');
    assert.strictEqual(msToTC(59 * 60000 + 59000), '59:59');
  });

  it('drops the milliseconds instead of rounding', () => {
    assert.strictEqual(msToTC(1999), '00:01');
  });

  it('adds an unpadded hour only once there is one', () => {
    assert.strictEqual(msToTC(3600000), '1:00:00');
    assert.strictEqual(msToTC(3661000), '1:01:01');
    assert.strictEqual(msToTC(10 * 3600000 + 5000), '10:00:05');
  });
});
