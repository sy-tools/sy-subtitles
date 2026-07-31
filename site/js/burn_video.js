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

// Mirrors the fullscreen CSS in components.css:
//   font-size: clamp(20px, calc(clamp(28px, 4vw, 80px) * var(--preview-subs-scale, 1)), 22vh)
//   padding-top: 80px; padding-bottom: 36px
// Kept as named constants so a CSS change has one obvious counterpart here.
var FS_FONT_MIN_PX = 28;
var FS_FONT_MAX_PX = 80;
var FS_FONT_VW = 0.04;
var FS_FONT_FLOOR_PX = 20;
var FS_FONT_VH_CAP = 0.22;
var FS_PADTOP_PX = 80;
var FS_PADBOT_PX = 36;

function clampNum(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

function fullscreenFontPx(viewportWidth, viewportHeight, subsScale) {
  var scale = (typeof subsScale === 'number' && isFinite(subsScale) && subsScale > 0)
    ? subsScale : 1;
  var base = clampNum(FS_FONT_MIN_PX, FS_FONT_VW * viewportWidth, FS_FONT_MAX_PX);
  return clampNum(FS_FONT_FLOOR_PX, base * scale, FS_FONT_VH_CAP * viewportHeight);
}

// A <video>/iframe letterboxes: whichever axis binds first decides the height
// the viewer actually sees, and that is what the ratios are relative to.
function displayedVideoHeight(viewportWidth, viewportHeight, videoWidth, videoHeight) {
  if (!(videoWidth > 0) || !(videoHeight > 0)) return viewportHeight;
  var byWidth = viewportWidth * (videoHeight / videoWidth);
  return Math.min(viewportHeight, byWidth);
}

function measureBurnRatios(geometry) {
  var g = geometry || {};
  var vw = g.viewportWidth > 0 ? g.viewportWidth : 1920;
  var vh = g.viewportHeight > 0 ? g.viewportHeight : 1080;
  var shown = displayedVideoHeight(vw, vh, g.videoWidth, g.videoHeight) || vh;
  return {
    font_ratio: fullscreenFontPx(vw, vh, g.subsScale) / shown,
    padtop_ratio: FS_PADTOP_PX / shown,
    padbot_ratio: FS_PADBOT_PX / shown,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BURN_WORKFLOW: BURN_WORKFLOW,
    BURN_RATIO_KEYS: BURN_RATIO_KEYS,
    makeRequestId: makeRequestId,
    buildBurnInputs: buildBurnInputs,
    matchRun: matchRun,
    burnStateKey: burnStateKey,
    FS_FONT_MAX_PX: FS_FONT_MAX_PX,
    FS_PADTOP_PX: FS_PADTOP_PX,
    FS_PADBOT_PX: FS_PADBOT_PX,
    fullscreenFontPx: fullscreenFontPx,
    displayedVideoHeight: displayedVideoHeight,
    measureBurnRatios: measureBurnRatios,
  };
}
