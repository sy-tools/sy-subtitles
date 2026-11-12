// Pipeline stage computation for a talk card — pure, no DOM.
//
// SINGLE SOURCE: loaded as a plain <script> in site/index.html AND required by
// tests/test_pipeline_stages.js and tests/test_spa_cache.js.

// A video declared `sync: ignored` in meta.yaml is never sent to whisper and
// never gets subtitles, so it is not part of what the talk has to finish.
// Only the written declaration counts — the same rule the pipeline's whisper
// discovery applies (tools/video_roles.py declared_ignored_slugs).
function countedVideos(tk) {
  return (tk.videos || []).filter(function(v) { return v.sync !== 'ignored'; });
}

function getPipelineStages(tk, st) {
  var videos = countedVideos(tk);
  var whisperSlugs = tk._whisperSlugs || [];
  var nVideos = videos.length;
  var nWhisper = 0;
  var nSrt = 0;
  videos.forEach(function(v) {
    if (whisperSlugs.indexOf(v.slug) !== -1) nWhisper++;
    if (v.hasSrt) nSrt++;
  });
  return {
    added: true,
    whisper: nWhisper >= nVideos && nVideos > 0,
    whisperProgress: nVideos > 0 ? nWhisper + '/' + nVideos : '0',
    translated: tk.hasUk,
    reviewed: tk.hasReviewReport,
    srt: nSrt >= nVideos && nVideos > 0,
    srtProgress: nVideos > 0 ? nSrt + '/' + nVideos : '0',
    hasIssue: !!(st && st.issue_number),
    review: st && st.status !== 'pending',
    approved: st && st.status === 'approved',
    nVideos: nVideos, nWhisper: nWhisper, nSrt: nSrt
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getPipelineStages: getPipelineStages };
}
