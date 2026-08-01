// Export menu — the preview header's one download control.
//
// The header used to carry a "Render video" button whose progress panel lived
// somewhere else entirely. There are really two things a reviewer downloads
// from a talk — the subtitle file, and the video with those subtitles burned
// in — so they became one download control with a two-item menu.
//
// The video item is not a button beside a progress bar: it IS the progress
// readout. It wears one of four faces, and which one is decided here rather
// than in DOM glue, so the decision is testable without a browser.
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
  //   downloading    the finished video is transferring to disk right now
  //   following      a run is in flight and being polled
  //   done           the followed run finished successfully
  //   stale          the subtitles changed since that run was dispatched
  //   expired        the run's artifact is past the 7-day retention
  //   justDownloaded the file landed and the menu has not been closed since
  //
  // Order matters: a transfer in progress outranks a run in flight (they cannot
  // both be true, and the transfer is the one the user just started), and both
  // `stale` and `expired` demote a finished run back to an offer to build — a
  // download that would hand over the wrong file, or no file, is worse than no
  // offer.
  //
  // `writeUser` is checked FIRST, ahead of even a transfer in flight, and that
  // is deliberate. A review raised the opposite: a session whose write access
  // lapses mid-transfer loses its readout. True, but the whole control goes with
  // it — the group is gated on the same condition in the page — so returning
  // 'downloading' would describe a row nobody can see, and the transfer still
  // announces itself when it lands. One rule for "this session cannot use the
  // API" beats a face that contradicts its own container.
  function videoItemState(o) {
    o = o || {};
    if (!o.writeUser) return { state: 'hidden', disabled: true, reasonKey: '' };
    // Written through the save dialog's own file handle, a burned video lands in
    // no downloads list and behind no shelf. This face is the only sign a few
    // hundred megabytes are moving.
    if (o.downloading) return { state: 'downloading', disabled: true, reasonKey: '' };
    if (o.following) return { state: 'working', disabled: true, reasonKey: '' };
    // The file already exists; which subtitles happen to be on screen cannot
    // unmake it, so the language guard does not reach the download.
    if (o.done && !o.stale && !o.expired) {
      // Right after the transfer lands the item is a statement, not a button:
      // flipping straight back to "Download..." reads as if nothing happened.
      // Closing the menu retires the claim; reopening offers the download again.
      if (o.justDownloaded) return { state: 'downloaded', disabled: true, reasonKey: '' };
      return { state: 'download', disabled: false, reasonKey: '' };
    }
    return {
      state: 'start',
      disabled: !!o.langMismatch,
      reasonKey: o.langMismatch ? 'burn.wrong_lang' : ''
    };
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

  var api = {
    exportIconSvg: exportIconSvg,
    videoItemState: videoItemState,
    downloadFraction: downloadFraction,
    megabytes: megabytes,
    exportSrtPath: exportSrtPath,
    exportSrtName: exportSrtName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (k) { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : this);
