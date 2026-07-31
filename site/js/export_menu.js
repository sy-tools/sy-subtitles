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
  //   writeUser     the session can dispatch a workflow run at all
  //   langMismatch  the preview shows subtitles the render would not burn
  //   following     a run is in flight and being polled
  //   done          the followed run finished successfully
  //   stale         the subtitles changed since that run was dispatched
  //   expired       the run's artifact is past the 7-day retention
  //
  // Order matters: a run in flight outranks everything, and both `stale` and
  // `expired` demote a finished run back to an offer to build — a download
  // that would hand over the wrong file, or no file, is worse than no offer.
  function videoItemState(o) {
    o = o || {};
    if (!o.writeUser) return { state: 'hidden', disabled: true, reasonKey: '' };
    if (o.following) return { state: 'working', disabled: true, reasonKey: '' };
    // The file already exists; which subtitles happen to be on screen cannot
    // unmake it, so the language guard does not reach the download.
    if (o.done && !o.stale && !o.expired) {
      return { state: 'download', disabled: false, reasonKey: '' };
    }
    return {
      state: 'start',
      disabled: !!o.langMismatch,
      reasonKey: o.langMismatch ? 'burn.wrong_lang' : ''
    };
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
    exportSrtPath: exportSrtPath,
    exportSrtName: exportSrtName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (k) { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : this);
