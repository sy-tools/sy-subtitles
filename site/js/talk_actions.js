// Decides which action links a talk card shows on the index. Single source:
// loaded by the browser via <script src="js/talk_actions.js"> in site/index.html
// AND required by the Node test suite — no inline mirror.
//
//   preview ("View translation")   — needs subtitles on a playable video
//                                     (a video with both an SRT and a vimeo_url).
//   review  ("Review translation") — needs EN+UK transcripts; shown even when
//                                     the talk has no subtitles yet (review runs
//                                     in transcript mode by default).
function talkActionVisibility(tk) {
  tk = tk || {};
  var videos = tk.videos || [];
  var hasPlayableSrt = videos.some(function (v) {
    return v && v.hasSrt && v.vimeo_url;
  });
  return {
    preview: hasPlayableSrt,
    review: !!(tk.hasEn && tk.hasUk),
  };
}

// A preview link to a text-only talk (no counted video) has no
// player to open, so it lands on the transcript review. null = no redirect;
// an unknown talk (manifest not loaded) is left to the preview's own handling.
// countedVideos comes from js/pipeline_stages.js, loaded before this file.
function previewRedirect(tk) {
  if (!tk || !tk.id || !tk.title) return null;  // meta.yaml not loaded: unknown, not text-only
  var counted = typeof countedVideos === 'function' ? countedVideos : require('./pipeline_stages').countedVideos;
  return counted(tk).length === 0 ? '#/review/' + tk.id : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { talkActionVisibility: talkActionVisibility, previewRedirect: previewRedirect };
}
