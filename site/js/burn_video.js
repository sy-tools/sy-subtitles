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

// Weights per workflow step. Names must match burn-subtitles.yml exactly —
// tests/test_burn_workflow.py guards the workflow side.
var BURN_STEP_WEIGHTS = [
  { name: 'Install dependencies', weight: 0.05 },
  { name: 'Download video', weight: 0.15 },
  { name: 'Burn subtitles', weight: 0.70 },
  { name: 'Upload result', weight: 0.10 }
];

var RENDER_STEP_NAME = 'Burn subtitles';

// Rendering runs at roughly this multiple of realtime on a 2-core runner
// (veryfast x264, ~24 min for an hour-long talk). Calibrate from real runs.
var RENDER_SPEED = 2.5;

// Never claim the interpolated render step is finished — only the API can say so.
var RENDER_CAP = 0.97;

function renderEtaSeconds(durationMs) {
  var ms = (typeof durationMs === 'number' && durationMs > 0) ? durationMs : 30 * 60 * 1000;
  return (ms / 1000) / RENDER_SPEED;
}

// Turns a GitHub job object into a fraction/label/terminal-state summary.
// Pure: no DOM, no network. ffmpeg has no channel into the Actions API, so
// progress inside the render step is interpolated from elapsed time and
// flagged `estimated: true` — never overstate certainty in a progress bar.
//
// Steps are looked up BY NAME from BURN_STEP_WEIGHTS and every other step is
// ignored. This is deliberate: actions/cache and actions/setup-python each
// append a "Post ..." step AFTER "Upload result" in the job's step list, so a
// "last step in the list means finished" heuristic would never report done.
// Terminal state comes only from job.status/job.conclusion, never from step
// position.
function computeProgress(job, nowMs, durationMs) {
  var result = { fraction: 0, label: '', estimated: false, done: false,
                 failed: false, failedStep: '' };
  var steps = (job && job.steps) || [];
  var byName = {};
  for (var i = 0; i < steps.length; i++) {
    if (steps[i] && steps[i].name) byName[steps[i].name] = steps[i];
  }

  var fraction = 0;
  for (var w = 0; w < BURN_STEP_WEIGHTS.length; w++) {
    var spec = BURN_STEP_WEIGHTS[w];
    var step = byName[spec.name];
    if (!step) continue;
    if (step.conclusion === 'failure' || step.conclusion === 'cancelled') {
      result.failed = true;
      result.failedStep = spec.name;
      result.fraction = fraction;
      result.label = spec.name;
      return result;
    }
    if (step.status === 'completed') {
      fraction += spec.weight;
      result.label = spec.name;
      continue;
    }
    if (step.status === 'in_progress') {
      result.label = spec.name;
      if (spec.name === RENDER_STEP_NAME) {
        // No true percentage exists here — interpolate and say so.
        var started = Date.parse(step.started_at || '') || nowMs;
        var elapsed = Math.max(0, (nowMs - started) / 1000);
        var share = Math.min(RENDER_CAP, elapsed / renderEtaSeconds(durationMs));
        fraction += spec.weight * share;
        result.estimated = true;
      }
      break;
    }
    // Any other status (e.g. 'queued') falls through here: it credits no
    // weight and does not break the loop. That's deliberate, not a gap —
    // GitHub always runs steps in declared order, so a later-named step is
    // never in_progress/completed while an earlier one is still queued.
    // Do not "fix" this into a break.
  }

  if (job && job.status === 'completed') {
    // status: 'completed' alone is not success — GitHub sets it the same way
    // on a job that failed, was cancelled, or died in "Set up job" before any
    // named step ran. Only conclusion: 'success' means the artifact exists.
    if (job.conclusion === 'success') {
      result.done = true;
      result.fraction = 1;
      result.estimated = false;
      return result;
    }
    if (!result.failed) {
      // Completed without success and no named step already flagged it —
      // still a failure, not a silent stall at 0%.
      result.failed = true;
    }
  }
  result.fraction = Math.min(fraction, RENDER_CAP);
  return result;
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
    BURN_STEP_WEIGHTS: BURN_STEP_WEIGHTS,
    RENDER_SPEED: RENDER_SPEED,
    renderEtaSeconds: renderEtaSeconds,
    computeProgress: computeProgress,
  };
}
