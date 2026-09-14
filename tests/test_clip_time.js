// Clip time — the text form of a fragment boundary.
//
// The fragment panel shows each boundary as text a reviewer can read and type,
// and the "set current player time" button fills it from the player. Whatever
// the button writes must read back to the same millisecond, and whatever a
// person types must either mean exactly one time or be refused.

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { formatClipTime, parseClipTime } = require('../site/js/clip_time');

describe('formatClipTime', () => {
  it('shows minutes and seconds, with milliseconds, under an hour', () => {
    assert.strictEqual(formatClipTime(0), '00:00.000');
    assert.strictEqual(formatClipTime(65500), '01:05.500');
    assert.strictEqual(formatClipTime(3599999), '59:59.999');
  });

  it('adds an hours field only once there are hours', () => {
    assert.strictEqual(formatClipTime(3600000), '1:00:00.000');
    assert.strictEqual(formatClipTime(5025120), '1:23:45.120');
    assert.strictEqual(formatClipTime(12780000), '3:33:00.000');
  });

  it('drops a zero millisecond part on request, and only a zero one', () => {
    assert.strictEqual(formatClipTime(0, { trimZeroMs: true }), '00:00');
    assert.strictEqual(formatClipTime(3600000, { trimZeroMs: true }), '1:00:00');
    // A real fraction is the precision the player reported; trimming it would
    // move the boundary the reviewer set.
    assert.strictEqual(formatClipTime(65500, { trimZeroMs: true }), '01:05.500');
    assert.strictEqual(formatClipTime(65001, { trimZeroMs: true }), '01:05.001');
  });

  it('rounds to a whole millisecond before splitting into fields', () => {
    // The player reports seconds as a float, so seconds * 1000 is rarely whole.
    assert.strictEqual(formatClipTime(65499.6), '01:05.500');
    // Rounding the millisecond field on its own would print 59.9996 s as
    // "00:59.1000"; the carry has to reach the seconds and the hours.
    assert.strictEqual(formatClipTime(59999.6), '01:00.000');
    assert.strictEqual(formatClipTime(3599999.5), '1:00:00.000');
  });

  it('floors a negative time at zero', () => {
    assert.strictEqual(formatClipTime(-1), '00:00.000');
    assert.strictEqual(formatClipTime(-65500, { trimZeroMs: true }), '00:00');
  });

  it('writes nothing for a time it was not given', () => {
    // An empty field is refused by parseClipTime, so an unknown time surfaces as
    // a problem the panel names — never as a boundary at 00:00 that would
    // quietly render from the start of the talk.
    for (const missing of [NaN, Infinity, undefined, null, 'soon']) {
      assert.strictEqual(formatClipTime(missing), '', String(missing));
    }
  });
});

describe('parseClipTime', () => {
  it('reads plain seconds, with or without a fraction', () => {
    assert.strictEqual(parseClipTime('0'), 0);
    assert.strictEqual(parseClipTime('65'), 65000);
    assert.strictEqual(parseClipTime('65.5'), 65500);
    // Any number of digits: a boundary deep into a talk can be typed in seconds.
    assert.strictEqual(parseClipTime('5025.12'), 5025120);
  });

  it('reads M:SS and H:MM:SS', () => {
    assert.strictEqual(parseClipTime('1:05'), 65000);
    assert.strictEqual(parseClipTime('01:05.500'), 65500);
    assert.strictEqual(parseClipTime('1:23:45.120'), 5025120);
    assert.strictEqual(parseClipTime('0:00:00'), 0);
  });

  it('lets the first field run past its usual range', () => {
    // Ninety minutes is naturally typed as 90:00, not 1:30:00.
    assert.strictEqual(parseClipTime('90:00'), 5400000);
    assert.strictEqual(parseClipTime('100:00:00'), 360000000);
  });

  it('right-pads a short fraction: .5 is half a second, not five milliseconds', () => {
    assert.strictEqual(parseClipTime('1.5'), 1500);
    assert.strictEqual(parseClipTime('1.05'), 1050);
    assert.strictEqual(parseClipTime('1.005'), 1005);
  });

  it('accepts a decimal comma', () => {
    // The Ukrainian decimal separator: a reviewer typing 1:05,5 means 1:05.5.
    assert.strictEqual(parseClipTime('1:05,5'), 65500);
    assert.strictEqual(parseClipTime('65,25'), 65250);
  });

  it('ignores whitespace around the time', () => {
    assert.strictEqual(parseClipTime('  1:05 '), 65000);
    assert.strictEqual(parseClipTime('\t65.5\n'), 65500);
  });

  it('refuses anything that does not name exactly one time', () => {
    const refused = [
      '', '   ',
      '-1', '+1',                     // signs
      '1 :05', '1: 05', '1:05 .5',    // spaces inside
      'abc', '1m', '1:05s', '0x10', '1e3',
      '1:2:3:4', '1:00:00:00',        // more than two colons
      '1:05.1234',                    // a four-digit fraction
      '1:5',                          // 1:05 or 1:50? Refused, not guessed.
      '1:60', '1:00:60', '1:60:00',   // a field after the first reaches 60
      '1.', '.5', '1:', ':05', '1::05', '1.5.5', '1:05.',
    ];
    for (const text of refused) {
      assert.strictEqual(parseClipTime(text), null, JSON.stringify(text));
    }
  });

  it('refuses a value that is not text', () => {
    assert.strictEqual(parseClipTime(null), null);
    assert.strictEqual(parseClipTime(undefined), null);
  });

  it('refuses a time too large to be an exact number of milliseconds', () => {
    assert.strictEqual(parseClipTime('9'.repeat(20)), null);
  });
});

describe('formatClipTime and parseClipTime together', () => {
  it('read back exactly what they write, across the hour boundary', () => {
    // The field shows formatClipTime's text and dispatches parseClipTime's
    // number: any drift between the two moves a boundary the reviewer set.
    const times = [0, 1, 999, 1000, 59999, 60000, 65500, 3599999, 3600000, 3600001,
                   5025120, 12780000, 360000000];
    for (const ms of times) {
      assert.strictEqual(parseClipTime(formatClipTime(ms)), ms, 'ms=' + ms);
      assert.strictEqual(parseClipTime(formatClipTime(ms, { trimZeroMs: true })), ms,
                         'trimmed ms=' + ms);
    }
  });
});
