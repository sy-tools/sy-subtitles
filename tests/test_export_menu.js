// Export menu — the download button's menu model.
//
// The preview header carries one download control. Its menu offers the
// subtitle file and, for a signed-in reviewer, the video with the subtitles
// burned in. That second item is not a button with a separate progress panel:
// it IS the progress readout, and which of its four faces it wears is decided
// here, in a pure function, so the decision can be tested without a browser.

const { describe, it } = require('node:test');
const assert = require('node:assert');

const M = require('../site/js/export_menu');

describe('export menu — the video item state', () => {
  function state(over) {
    return M.videoItemState(Object.assign({
      writeUser: true, langMismatch: false, following: false,
      done: false, stale: false, expired: false
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
  });

  it('becomes the progress readout while a run is being followed', () => {
    const s = state({ following: true });
    assert.strictEqual(s.state, 'working');
    assert.strictEqual(s.disabled, true, 'there is nothing to click while it runs');
  });

  it('turns into the download once the run has finished', () => {
    assert.deepStrictEqual(state({ done: true }),
      { state: 'download', disabled: false, reasonKey: '' });
  });

  it('offers a render again once the subtitles have moved on', () => {
    // The finished video no longer matches the subtitles on screen, so the
    // item stops offering it and offers to build the current text instead.
    assert.strictEqual(state({ done: true, stale: true }).state, 'start');
  });

  it('offers a render again once the artifact has expired', () => {
    // Actions deletes artifacts after 7 days: the run says done, the file is
    // gone. Offering a download that cannot succeed is worse than no offer.
    assert.strictEqual(state({ done: true, expired: true }).state, 'start');
  });

  it('refuses to start over a preview in another language, and says why', () => {
    // The workflow burns final/uk.srt and takes no language input, so a render
    // started over the English preview comes back Ukrainian after ~25 minutes.
    const s = state({ langMismatch: true });
    assert.strictEqual(s.state, 'start');
    assert.strictEqual(s.disabled, true);
    assert.strictEqual(s.reasonKey, 'burn.wrong_lang');
  });

  it('still hands over a finished video while the preview shows another language', () => {
    // The file already exists; which subtitles are on screen cannot unmake it.
    const s = state({ done: true, langMismatch: true });
    assert.strictEqual(s.state, 'download');
    assert.strictEqual(s.disabled, false);
  });
});

describe('export menu — the video item while the file is transferring', () => {
  // A burned video is a few hundred MB, and it is written through the save
  // dialog's own file handle: no entry in the browser's downloads list, no
  // shelf, no progress of its own. Without a face of its own here, a reviewer
  // clicks Download and the menu says nothing for minutes.
  const base = { writeUser: true, done: true };

  it('reports the transfer instead of offering the download again', () => {
    const s = M.videoItemState(Object.assign({}, base, { downloading: true }));
    assert.strictEqual(s.state, 'downloading');
    assert.strictEqual(s.disabled, true, 'a second click must not start a second transfer');
  });

  it('outranks a render in flight — the two cannot both be true', () => {
    const s = M.videoItemState({ writeUser: true, downloading: true, following: true });
    assert.strictEqual(s.state, 'downloading');
  });

  it('still hides from a session that cannot render at all', () => {
    const s = M.videoItemState({ writeUser: false, downloading: true });
    assert.strictEqual(s.state, 'hidden');
  });
});

describe('export menu — the video item after the file has landed', () => {
  // A completed transfer flips the item straight back to "Download the video
  // with subtitles" — which reads as if nothing happened. The item keeps a
  // "downloaded" face until the menu is closed; reopening offers the download
  // again.
  const base = { writeUser: true, done: true, justDownloaded: true };

  it('says the video has been downloaded, and is not a button', () => {
    const s = M.videoItemState(base);
    assert.strictEqual(s.state, 'downloaded');
    assert.strictEqual(s.disabled, true,
      'the label is a statement, not an action — reopening re-arms the download');
  });

  it('withdraws the claim once the subtitles have moved on', () => {
    // An edit makes the downloaded file no longer the text on screen: the item
    // goes back to offering a build, exactly as the plain download face does.
    const s = M.videoItemState(Object.assign({}, base, { stale: true }));
    assert.strictEqual(s.state, 'start');
  });

  it('yields to a transfer in flight', () => {
    // One slot: a new transfer for another video can be running while this
    // item's file already landed. The moving bytes outrank the finished claim.
    const s = M.videoItemState(Object.assign({}, base, { downloading: true }));
    assert.strictEqual(s.state, 'downloading');
  });

  it('still hides from a session that cannot render at all', () => {
    const s = M.videoItemState(Object.assign({}, base, { writeUser: false }));
    assert.strictEqual(s.state, 'hidden');
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
