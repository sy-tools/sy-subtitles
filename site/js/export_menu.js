// Export menu — the preview header's one download control.
//
// The header used to carry a "Render video" button whose progress panel lived
// somewhere else entirely. There are really two things a reviewer downloads
// from a talk — the subtitle file, and the video with those subtitles burned
// in — so they became one download control. Its menu offers the subtitle file,
// an offer to burn the subtitles into the video (whole, or a fragment of it),
// and the videos already created for this talk and video, which is where every
// video download starts.
//
// The offer is not a button beside a progress bar: it IS the progress readout.
// Which face it wears, and which face each row of the list wears, is decided
// here rather than in DOM glue, so the decisions are testable without a browser.
//
// Single source shared by index.html (<script src>) and the node test suite.
(function (root) {
  'use strict';

  // A downward arrow into a tray: the plain download mark. 24x24 to match the
  // sync cloud, stroked in currentColor so it inherits the control's ink in
  // both themes, and aria-hidden because the control carries the name.
  function exportIconSvg() {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none"'
      + ' stroke="currentColor" stroke-width="1.7" stroke-linecap="round"'
      + ' stroke-linejoin="round" aria-hidden="true" focusable="false">'
      + '<path d="M12 3.5V15"/>'
      + '<polyline points="7.5 10.5 12 15 16.5 10.5"/>'
      + '<path d="M4.5 17.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1.5"/>'
      + '</svg>';
  }

  // Which face the video item wears, and whether it can be pressed.
  //
  //   writeUser      the session can dispatch a workflow run at all
  //   langMismatch   the preview shows subtitles the render would not burn
  //   following      a run is in flight and being polled
  //
  // Three faces — hidden, working, start — and none of them is a download. A
  // finished render appears at the top of the "already created videos" list,
  // which is where every download happens (historyRowState). The item used to
  // turn into the download itself, and that face hid the offer to build for as
  // long as the subtitles stayed unchanged: exactly when a reviewer wants a
  // fragment of those same subtitles.
  //
  // `writeUser` is checked FIRST, ahead of even a run in flight. A session whose
  // write access lapses mid-run loses its readout, but the whole control goes
  // with it — the page gates the item on the same condition — so 'working'
  // would describe a row nobody can see. One rule for "this session cannot use
  // the API" beats a face that contradicts its own container.
  function videoItemState(o) {
    o = o || {};
    if (!o.writeUser) return { state: 'hidden', disabled: true, reasonKey: '' };
    if (o.following) return { state: 'working', disabled: true, reasonKey: '' };
    return {
      state: 'start',
      disabled: !!o.langMismatch,
      reasonKey: o.langMismatch ? 'burn.wrong_lang' : ''
    };
  }

  // Which face one row of the "already created videos" list wears.
  //
  //   downloading  the row's file is transferring to disk right now
  //   downloaded   the file landed and the menu has not been closed since
  //
  // Written through the save dialog's own file handle, a burned video lands in
  // no downloads list and behind no shelf: this face is the only sign a few
  // hundred megabytes are moving, and the only word that they arrived. The
  // landed claim keeps standing until the menu closes — flipping straight back
  // to a bare row reads as if nothing happened — but it does NOT take the row
  // out of service: it was a statement instead of a button once, and a reviewer
  // who saved to the wrong folder, or wanted a second copy, had to close the
  // menu and reopen it to be offered the video again. A note is a note.
  //
  // So exactly one thing disables a row: its own bytes moving. A second
  // transfer of the same file would rebrand the first one's chunks, and a
  // transfer in flight outranks the landed claim anyway — the moving bytes are
  // the newer fact.
  //
  // No language guard: the file already exists, and which subtitles happen to be
  // on screen cannot unmake it.
  function historyRowState(o) {
    o = o || {};
    if (o.downloading) return { state: 'downloading', disabled: true };
    if (o.downloaded) return { state: 'downloaded', disabled: false };
    return { state: 'download', disabled: false };
  }

  // When a listed video was made: day, month and time. No year — nothing in the
  // list is older than the seven-day artifact retention. The page passes no
  // `timeZone`, which means the viewer's own; the tests pin one.
  function historyWhen(ms, locale, timeZone) {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: timeZone
    }).format(new Date(ms));
  }

  // How much of the transfer has landed, 0..1, or null when the response
  // carried no length. An invented bar is worse than no bar: the reviewer would
  // read a made-up position as a real one.
  function downloadFraction(loaded, total) {
    var size = Number(total);
    if (!size || !isFinite(size) || size <= 0) return null;
    return Math.min(1, Math.max(0, Number(loaded) / size));
  }

  // Whole megabytes — the unit these numbers live in (a burned talk runs 100 MB
  // to 2 GB). Rounded, because a tenth of a megabyte is noise at this scale.
  function megabytes(bytes) {
    return Math.round(Number(bytes || 0) / (1024 * 1024));
  }

  // The published subtitles for a video — the same file the render reads, so
  // the two downloads can never disagree about what "the subtitles" are.
  function exportSrtPath(talkId, videoSlug, lang) {
    return 'talks/' + talkId + '/' + videoSlug + '/final/' + lang + '.srt';
  }

  // Talk and video both, because a reviewer downloads several of these into
  // one folder — the same shape the burned video's file name uses.
  function exportSrtName(talkId, videoSlug, lang) {
    return talkId + '__' + videoSlug + '__' + lang + '.srt';
  }

  // HH-MM-SS, plus -mmm for a bound that falls between two whole seconds.
  //
  // Flooring both bounds made 1.000–2.500 and 1.400–2.999 one and the same file
  // name, and the second fragment silently saved over the first. The boundaries
  // are read off the player to the millisecond precisely because a frame
  // matters, so the milliseconds are what tell two such fragments apart. They
  // are written per bound and only where there are any: a span chosen on whole
  // seconds keeps the short name it had, and the padding stops 2.050 and 2.500
  // from both reading as a bare "-5".
  //
  // The rounding is defensive, not a case that happens: every caller passes
  // whole milliseconds (parseClipTime builds them, the run name is parsed as an
  // integer). It is here so a fractional millisecond from some future caller
  // cannot reach the modulo and put a decimal point into a file name.
  function fileClock(ms) {
    var total = Math.max(0, Math.round(ms));
    var frac = total % 1000;
    var s = Math.floor(total / 1000);
    var clock = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (n) {
      return n < 10 ? '0' + n : String(n);
    }).join('-');
    return frac === 0 ? clock : clock + '-' + ('00' + frac).slice(-3);
  }

  // The saved video's file name, shaped like exportSrtName. A fragment adds its
  // span, so two fragments of one video do not share a name — written with
  // dashes, because a colon is illegal in file names on Windows and in macOS
  // Finder.
  function burnedVideoName(talkId, videoSlug, clip) {
    var base = talkId + '__' + videoSlug + '__uk';
    if (!clip) return base + '.mp4';
    return base + '__' + fileClock(clip.startMs) + '_' + fileClock(clip.endMs) + '.mp4';
  }

  var api = {
    exportIconSvg: exportIconSvg,
    videoItemState: videoItemState,
    historyRowState: historyRowState,
    historyWhen: historyWhen,
    downloadFraction: downloadFraction,
    megabytes: megabytes,
    exportSrtPath: exportSrtPath,
    exportSrtName: exportSrtName,
    burnedVideoName: burnedVideoName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (k) { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : this);
