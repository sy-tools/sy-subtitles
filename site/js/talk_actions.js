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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { talkActionVisibility: talkActionVisibility };
}
