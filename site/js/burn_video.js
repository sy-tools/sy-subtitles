// Burned-in subtitle rendering: triggers burn-subtitles.yml, follows the run,
// and turns the resulting artifact into a plain .mp4 download.
//
// Logic lives here (and is unit-tested by tests/test_burn_video.js); index.html
// only wires it to the DOM — the single-source pattern used by preview_state.js.

var BURN_WORKFLOW = 'burn-subtitles.yml';

// The three ratios the workflow requires. Sizing travels as fractions of the
// displayed video height, never pixels: fullscreen derives its font size from
// viewport width, so pixels would make the output depend on the monitor.
var BURN_RATIO_KEYS = ['font_ratio', 'padtop_ratio', 'padbot_ratio'];

// workflow_dispatch does not return a run id, so we stamp an opaque token into
// the run name and search for it. Must survive being put in a run-name and a
// URL, hence the restricted alphabet. Talk/video scoping lives in
// burnStateKey and the run name itself, not in the token.
function makeRequestId(now, rand) {
  var stamp = Number(now).toString(36);
  var noise = Math.floor((rand ? rand() : Math.random()) * 0x10000).toString(36);
  return 'req-' + stamp + '-' + noise;
}

function buildBurnInputs(talkId, videoSlug, ratios, requestId) {
  var inputs = { talk_id: String(talkId), video_slug: String(videoSlug),
                 request_id: String(requestId) };
  for (var i = 0; i < BURN_RATIO_KEYS.length; i++) {
    var key = BURN_RATIO_KEYS[i];
    var value = ratios ? ratios[key] : undefined;
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('burn: missing or non-numeric ratio ' + key);
    }
    // workflow_dispatch inputs are strings on the wire.
    inputs[key] = String(value);
  }
  return inputs;
}

// Match on a word boundary so 'req-A' never matches a run titled 'req-A-EXTRA'.
function matchRun(runs, requestId) {
  var list = runs || [];
  var pattern = new RegExp('(^|[^A-Za-z0-9-])'
    + String(requestId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    + '([^A-Za-z0-9-]|$)');
  for (var i = 0; i < list.length; i++) {
    var run = list[i];
    if (!run) continue;
    var title = String(run.display_title || run.name || '');
    if (pattern.test(title)) return run;
  }
  return null;
}

function burnStateKey(talkId, videoSlug) {
  return 'sy.burn.' + talkId + '.' + videoSlug;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BURN_WORKFLOW: BURN_WORKFLOW,
    BURN_RATIO_KEYS: BURN_RATIO_KEYS,
    makeRequestId: makeRequestId,
    buildBurnInputs: buildBurnInputs,
    matchRun: matchRun,
    burnStateKey: burnStateKey,
  };
}
