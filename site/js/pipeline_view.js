// The talk card's review-status badge and the pipeline diagram that opens
// under it. Single source: loaded by the browser via
// <script src="js/pipeline_view.js"> in site/index.html AND required by the
// Node test suite — no inline mirror.
//
// Both return HTML for innerHTML. `t` (the page's translator), `esc` and
// `safeHref` (js/html_escape.js) and `REPO` (owner/name) are arguments, so
// nothing here reads a global the page defines.

function renderStatusBadge(status, reviewSt, t, esc, safeHref, REPO) {
  var labels = {
    'approved': t('badge.approved'),
    'in-review': t('badge.in_review'),
    'ready-for-review': t('badge.needs_review'),
    'in-progress': t('badge.pending')
  };
  var text = labels[status] || status;
  if (status === 'in-review' && reviewSt && reviewSt.reviewer) text += ' (' + esc(reviewSt.reviewer) + ')';
  var href = safeHref(reviewSt && reviewSt.issue_number ? 'https://github.com/' + REPO + '/issues/' + reviewSt.issue_number : '');
  if (href) return '<a href="' + href + '" target="_blank" class="review-badge ' + status + '">' + text + '</a>';
  return '<span class="review-badge ' + status + '">' + text + '</span>';
}

function renderPipelineDAG(tk, stages, st, t, esc, safeHref, REPO) {
  function node(label, done, href, extraCls) {
    var cls = 'pipe-node' + (done ? ' done' : '') + (extraCls ? ' ' + extraCls : '');
    var sh = safeHref(href);
    if (sh) return '<a href="' + sh + '" class="' + cls + '">' + esc(label) + '</a>';
    return '<span class="' + cls + '">' + esc(label) + '</span>';
  }
  function arrow(done) {
    return '<span class="pipe-arrow' + (done ? ' done' : '') + '">&rarr;</span>';
  }

  var wLabel = t('pipe.ai_transcribed') + (stages.nVideos > 1 ? ' ' + stages.whisperProgress : '');
  var sLabel = t('pipe.srt') + (stages.nVideos > 1 ? ' ' + stages.srtProgress : '');
  var reviewHref = st && st.issue_number ? 'https://github.com/' + REPO + '/issues/' + st.issue_number : '';
  var reviewNode = node(t('pipe.review'), stages.review || stages.approved, '', stages.approved ? 'approved' : (stages.review ? 'in-review' : ''))
    + arrow(stages.approved)
    + node(t('pipe.approved'), stages.approved);

  // A text-only talk has no video: no whisper, no subtitles — the translation is the
  // whole build, and the issue follows it.
  if (stages.textOnly) {
    return '<div class="pipe-dag">'
      + node(t('pipe.added'), true) + arrow(true)
      + node(t('pipe.ai_translated'), stages.translated) + arrow(stages.translated)
      + node(t('pipe.ai_reviewed'), stages.reviewed) + arrow(stages.translated && stages.hasIssue)
      + node(t('pipe.issue'), stages.hasIssue, reviewHref) + arrow(stages.hasIssue)
      + reviewNode
      + '</div>';
  }

  var topBranch = node(wLabel, stages.whisper);
  var bottomBranch = node(t('pipe.ai_translated'), stages.translated)
    + arrow(stages.translated) + node(t('pipe.ai_reviewed'), stages.reviewed);

  var aiFork = '<div class="pipe-fork">'
    + '<div class="pipe-row">' + topBranch + '</div>'
    + '<div class="pipe-row">' + bottomBranch + '</div>'
    + '</div>';

  var joinFork = '<div class="pipe-fork">'
    + '<div class="pipe-row">' + aiFork + arrow(stages.whisper && stages.reviewed) + node(sLabel, stages.srt) + '</div>'
    + '<div class="pipe-row">' + node(t('pipe.issue'), stages.hasIssue, reviewHref) + '</div>'
    + '</div>';

  return '<div class="pipe-dag">'
    + node(t('pipe.added'), true) + arrow(true)
    + joinFork + arrow(stages.srt && stages.hasIssue)
    + reviewNode
    + '</div>';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderStatusBadge: renderStatusBadge, renderPipelineDAG: renderPipelineDAG };
}
