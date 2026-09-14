// Export menu — the download button's menu model.
//
// The preview header carries one download control. Its menu offers the
// subtitle file and, for a signed-in reviewer, an offer to burn the subtitles
// into the video plus the list of videos already created from it. The offer is
// not a button with a separate progress panel: it IS the progress readout.
// Which face it wears, and which face each list row wears, is decided here, in
// pure functions, so the decisions can be tested without a browser.

const { describe, it } = require('node:test');
const assert = require('node:assert');

const M = require('../site/js/export_menu');

describe('export menu — the video item state', () => {
  function state(over) {
    return M.videoItemState(Object.assign({
      writeUser: true, langMismatch: false, following: false
    }, over));
  }

  it('offers the render to a signed-in reviewer with nothing running', () => {
    assert.deepStrictEqual(state(), { state: 'start', disabled: false, reasonKey: '' });
  });

  it('hides the item entirely from a session that cannot dispatch', () => {
    // Read-only and signed-out sessions cannot start a workflow run. An item
    // that is only ever disabled teaches nothing; it is not their control.
    assert.strictEqual(state({ writeUser: false }).state, 'hidden');
    // Even mid-run: the state belongs to whoever started it, not to this tab.
    assert.strictEqual(state({ writeUser: false, following: true }).state, 'hidden');
    assert.strictEqual(M.videoItemState().state, 'hidden');
  });

  it('becomes the progress readout while a run is being followed', () => {
    const s = state({ following: true });
    assert.strictEqual(s.state, 'working');
    assert.strictEqual(s.disabled, true, 'there is nothing to click while it runs');
  });

  it('stays the readout while a run is followed over another language', () => {
    // The language guard is about starting a run; one already in flight burns
    // what it burns, and there is nothing to start until it ends.
    const s = state({ following: true, langMismatch: true });
    assert.strictEqual(s.state, 'working');
    assert.strictEqual(s.reasonKey, '');
  });

  it('refuses to start over a preview in another language, and says why', () => {
    // The workflow burns final/uk.srt and takes no language input, so a render
    // started over the English preview comes back Ukrainian after ~25 minutes.
    const s = state({ langMismatch: true });
    assert.strictEqual(s.state, 'start');
    assert.strictEqual(s.disabled, true);
    assert.strictEqual(s.reasonKey, 'burn.wrong_lang');
  });

  it('keeps offering a render once a run has finished', () => {
    // A finished render is listed at the top of the already-created videos,
    // which is where every download happens. The item used to become the
    // download itself, and that face hid the offer to build for as long as the
    // subtitles stayed unchanged — exactly when a reviewer wants a fragment of
    // those same subtitles. The inputs that drove it no longer mean anything.
    const s = state({ done: true, stale: false, expired: false,
                      downloading: true, justDownloaded: true });
    assert.deepStrictEqual(s, { state: 'start', disabled: false, reasonKey: '' });
  });

  it('wears only three faces', () => {
    const faces = new Set();
    for (const writeUser of [false, true]) {
      for (const langMismatch of [false, true]) {
        for (const following of [false, true]) {
          faces.add(M.videoItemState({ writeUser, langMismatch, following }).state);
        }
      }
    }
    assert.deepStrictEqual([...faces].sort(), ['hidden', 'start', 'working']);
  });
});

describe('export menu — a row of the already-created videos', () => {
  // A burned video is a few hundred MB, and it is written through the save
  // dialog's own file handle: no entry in the browser's downloads list, no
  // shelf, no progress of its own. The row is the only readout the transfer has.

  it('offers the download', () => {
    assert.deepStrictEqual(M.historyRowState({ downloading: false, downloaded: false }),
      { state: 'download', disabled: false });
    assert.deepStrictEqual(M.historyRowState(), { state: 'download', disabled: false });
  });

  it('reports the transfer instead of offering the download again', () => {
    const s = M.historyRowState({ downloading: true });
    assert.strictEqual(s.state, 'downloading');
    assert.strictEqual(s.disabled, true, 'a second click must not start a second transfer');
  });

  it('says the video has been downloaded and still offers it again', () => {
    // The note is kept — flipping straight back to a bare row reads as if
    // nothing happened — but keeping it used to cost the row its only way to
    // download again: the reviewer who saved to the wrong folder, or wanted a
    // second copy, had to close the menu and reopen it to get the offer back.
    // The note is now a note, not a dead end.
    const s = M.historyRowState({ downloaded: true });
    assert.strictEqual(s.state, 'downloaded');
    assert.strictEqual(s.disabled, false,
      'the landed claim is a note beside a live row, not a disabled one');
  });

  it('disables a row only while its own bytes are moving', () => {
    // The one reason to refuse a click: a second transfer of the same file on
    // top of the first. Nothing else about a row makes it unpressable.
    const busy = ['downloading'];
    for (const flag of ['downloading', 'downloaded']) {
      const o = {};
      o[flag] = true;
      assert.strictEqual(M.historyRowState(o).disabled, busy.indexOf(flag) > -1,
        flag + ' must ' + (busy.indexOf(flag) > -1 ? '' : 'not ') + 'disable the row');
    }
  });

  it('lets a transfer in flight outrank the finished claim', () => {
    // The moving bytes are the newer fact.
    const s = M.historyRowState({ downloading: true, downloaded: true });
    assert.strictEqual(s.state, 'downloading');
  });
});

describe('export menu — when a video was made', () => {
  const MADE = Date.UTC(2026, 8, 6, 14, 5, 42);   // 2026-09-06 14:05:42 UTC

  it('shows day, month and time, and neither the year nor the seconds', () => {
    // Nothing in the list is older than the seven-day artifact retention.
    const text = M.historyWhen(MADE, 'uk', 'UTC');
    assert.match(text, /06/);
    assert.match(text, /09/);
    assert.match(text, /14:05/);
    assert.ok(!/2026/.test(text), 'no year: ' + text);
    assert.ok(!/42/.test(text), 'no seconds: ' + text);
  });

  it('asks Intl for exactly day, month, hour and minute', () => {
    // Compared against Intl itself rather than a literal, because the
    // punctuation between the fields is locale data that differs across ICU
    // versions (CI runs a different Node than a laptop).
    const expected = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
    }).format(new Date(MADE));
    assert.strictEqual(M.historyWhen(MADE, 'en-GB', 'UTC'), expected);
  });

  it('reads the time in the zone it is given', () => {
    // The app passes no zone — the viewer's own. The tests pin one so they do
    // not depend on the machine that runs them.
    assert.match(M.historyWhen(MADE, 'uk', 'Asia/Tokyo'), /23:05/);
  });
});

describe('export menu — the burned video file', () => {
  const TALK = '1975-03-29_Public-Program';
  const VIDEO = 'Dadar-Mumbai';

  it('names the whole video like the subtitle file', () => {
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO, null),
      '1975-03-29_Public-Program__Dadar-Mumbai__uk.mp4');
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO), M.burnedVideoName(TALK, VIDEO, null));
  });

  it('adds the span of a fragment, so two fragments of one video do not collide', () => {
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO, { startMs: 600000, endMs: 930500 }),
      '1975-03-29_Public-Program__Dadar-Mumbai__uk__00-10-00_00-15-30-500.mp4');
  });

  it('writes two-digit hours, minutes and seconds', () => {
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO, { startMs: 59000, endMs: 5025000 }),
      '1975-03-29_Public-Program__Dadar-Mumbai__uk__00-00-59_01-23-45.mp4');
  });

  it('keeps a whole-second bound plain and spells a fractional one out', () => {
    // Flooring BOTH bounds made 1.000–2.500 and 1.400–2.999 one and the same
    // file name, and the second fragment saved over the first. The milliseconds
    // are what tell them apart, and they appear per bound and only where there
    // are any — a span chosen on whole seconds keeps the short name it had.
    const base = '1975-03-29_Public-Program__Dadar-Mumbai__uk__';
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO, { startMs: 1000, endMs: 2500 }),
      base + '00-00-01_00-00-02-500.mp4');
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO, { startMs: 1400, endMs: 2999 }),
      base + '00-00-01-400_00-00-02-999.mp4');
    // Padded, or 2.050 and 2.500 would both read as "-50" and "-5".
    assert.strictEqual(M.burnedVideoName(TALK, VIDEO, { startMs: 2050, endMs: 3005 }),
      base + '00-00-02-050_00-00-03-005.mp4');
  });

  it('never puts a colon in the name', () => {
    // Illegal in file names on Windows and in macOS Finder.
    const name = M.burnedVideoName(TALK, VIDEO, { startMs: 3600000, endMs: 3661000 });
    assert.ok(!name.includes(':'), name);
    assert.match(name, /__01-00-00_01-01-01\.mp4$/);
  });
});

describe('export menu — transfer arithmetic', () => {
  it('is the fraction of the file that has landed', () => {
    assert.strictEqual(M.downloadFraction(0, 200), 0);
    assert.strictEqual(M.downloadFraction(50, 200), 0.25);
    assert.strictEqual(M.downloadFraction(200, 200), 1);
  });

  it('never exceeds one, however many bytes arrive', () => {
    // Content-Length can disagree with the body; a bar past 100% reads as a bug.
    assert.strictEqual(M.downloadFraction(300, 200), 1);
  });

  it('has no fraction to report without a length', () => {
    // Some responses carry no length, and an invented bar is worse than none.
    assert.strictEqual(M.downloadFraction(50, 0), null);
    assert.strictEqual(M.downloadFraction(50, null), null);
    assert.strictEqual(M.downloadFraction(50, undefined), null);
  });

  it('reads sizes in whole megabytes, the unit the numbers live in', () => {
    assert.strictEqual(M.megabytes(0), 0);
    assert.strictEqual(M.megabytes(1024 * 1024), 1);
    assert.strictEqual(M.megabytes(280.6 * 1024 * 1024), 281);
  });
});

describe('export menu — the subtitle file', () => {
  it('names the file after the talk, the video and the language', () => {
    assert.strictEqual(M.exportSrtName('1975-03-29_Public-Program', 'Dadar-Mumbai', 'uk'),
      '1975-03-29_Public-Program__Dadar-Mumbai__uk.srt');
  });

  it('points at the published subtitles, not the SPA state', () => {
    // The file comes from the same ref the render reads, so the two downloads
    // can never disagree about what "the subtitles" are.
    assert.strictEqual(M.exportSrtPath('1975-03-29_Public-Program', 'Dadar-Mumbai', 'uk'),
      'talks/1975-03-29_Public-Program/Dadar-Mumbai/final/uk.srt');
  });
});

describe('export menu — the icon', () => {
  it('is a stroke SVG, never an emoji or a text glyph', () => {
    const svg = M.exportIconSvg();
    assert.match(svg, /^<svg[\s>]/, 'the icon must be an inline SVG element');
    assert.match(svg, /stroke="currentColor"/,
      'the icon inherits its ink from the control, in both themes');
    assert.ok(!/fill="(?!none)/.test(svg), 'stroke icons carry no solid fills');
    assert.match(svg, /aria-hidden="true"/,
      'the glyph is decorative — the control carries the accessible name');
  });
});
