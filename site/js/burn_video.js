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
// tests/test_burn_workflow_steps.py pins the two files against each other.
//
// The nine "Render NN%" entries and "Finish render" are not work in their own
// right: each is a step that blocks until the detached ffmpeg encode passes
// that percentage (tools/render_gate.py). A step COMPLETING is the only live,
// CORS-clean signal a browser has into a running job, and it is one the SPA
// already polls — so the render percentage below is ffmpeg's own, not a guess.
//
// Written out literally on purpose: a generated `Render NN%` loop would be
// clever and would hide a typo'd name behind matching-but-wrong output.
var BURN_STEP_WEIGHTS = [
  { name: 'Install dependencies', weight: 0.05 },
  { name: 'Download video', weight: 0.15 },
  { name: 'Start render', weight: 0.05 },
  { name: 'Render 10%', weight: 0.065 },
  { name: 'Render 20%', weight: 0.065 },
  { name: 'Render 30%', weight: 0.065 },
  { name: 'Render 40%', weight: 0.065 },
  { name: 'Render 50%', weight: 0.065 },
  { name: 'Render 60%', weight: 0.065 },
  { name: 'Render 70%', weight: 0.065 },
  { name: 'Render 80%', weight: 0.065 },
  { name: 'Render 90%', weight: 0.065 },
  { name: 'Finish render', weight: 0.065 },
  { name: 'Upload result', weight: 0.10 }
];

// The contiguous run of steps that IS the encode: 'Start render' through
// 'Finish render', carrying 0.70 of the bar after 0.20 of setup. Exported so a
// caller drawing a segmented track does not re-derive these bounds from the
// table and drift out of step with it.
var BURN_RENDER_BLOCK = {
  firstStep: 'Start render',
  lastStep: 'Finish render',
  weight: 0.70,
  offset: 0.20
};

function burnStepIndex(name) {
  for (var i = 0; i < BURN_STEP_WEIGHTS.length; i++) {
    if (BURN_STEP_WEIGHTS[i].name === name) return i;
  }
  return -1;
}

// Seconds left in the render, extrapolated from the rate actually observed:
// `renderFraction` of the block took `elapsedSeconds`, so the rest takes
// proportionally longer. This is a MEASURED rate, which is why no calibrated
// "render speed" constant is needed any more — a slow runner or a 4K source
// simply shows up as a slower measured rate.
//
// null when there is nothing honest to say: before the first gate completes
// there is no rate, and at or past 1 there is no remainder.
function renderEtaSeconds(renderFraction, elapsedSeconds) {
  var f = Number(renderFraction);
  if (!f || !isFinite(f) || f >= 1) return null;
  return elapsedSeconds * (1 - f) / f;
}

// Turns a GitHub job object into a fraction/label/terminal-state summary.
// Pure: no DOM, no network. The fraction is a fact, not an estimate: every
// weight below is credited only when its step actually completed.
//
// Steps are looked up BY NAME from BURN_STEP_WEIGHTS and every other step is
// ignored. This is deliberate: actions/cache and actions/setup-python each
// append a "Post ..." step AFTER "Upload result" in the job's step list, so a
// "last step in the list means finished" heuristic would never report done.
// Terminal state comes only from job.status/job.conclusion, never from step
// position.
function computeProgress(job, nowMs) {
  var result = { fraction: 0, label: '', done: false, failed: false,
                 failedStep: '', renderFraction: null, renderStartedMs: null };
  var steps = (job && job.steps) || [];
  var byName = {};
  for (var i = 0; i < steps.length; i++) {
    if (steps[i] && steps[i].name) byName[steps[i].name] = steps[i];
  }

  var firstRender = burnStepIndex(BURN_RENDER_BLOCK.firstStep);
  var lastRender = burnStepIndex(BURN_RENDER_BLOCK.lastStep);
  var startStep = byName[BURN_RENDER_BLOCK.firstStep];
  if (startStep) {
    // Date.parse('') is NaN, which || turns into null — an unstarted step
    // must not read as "started at the epoch".
    result.renderStartedMs = Date.parse(startStep.started_at || '') || null;
  }

  var fraction = 0;
  var renderCredited = 0;
  for (var w = 0; w < BURN_STEP_WEIGHTS.length; w++) {
    var spec = BURN_STEP_WEIGHTS[w];
    var step = byName[spec.name];
    if (!step) continue;
    if (step.conclusion === 'failure' || step.conclusion === 'cancelled') {
      result.failed = true;
      result.failedStep = spec.name;
      result.label = spec.name;
      break;
    }
    if (step.status === 'completed') {
      fraction += spec.weight;
      if (w >= firstRender && w <= lastRender) renderCredited += spec.weight;
      result.label = spec.name;
      continue;
    }
    if (step.status === 'in_progress') {
      result.label = spec.name;
      break;
    }
    // Any other status (e.g. 'queued') falls through here: it credits no
    // weight and does not break the loop. That's deliberate, not a gap —
    // GitHub always runs steps in declared order, so a later-named step is
    // never in_progress/completed while an earlier one is still queued.
    // Do not "fix" this into a break.
  }

  // null until the encode has actually begun: an ETA computed from a block
  // that has not started would divide by nothing.
  if (result.renderStartedMs !== null || renderCredited > 0) {
    result.renderFraction = renderCredited / BURN_RENDER_BLOCK.weight;
  }

  if (job && job.status === 'completed') {
    // status: 'completed' alone is not success — GitHub sets it the same way
    // on a job that failed, was cancelled, or died in "Set up job" before any
    // named step ran. Only conclusion: 'success' means the artifact exists.
    //
    // A named step that already reported failure outranks a job-level success:
    // the two can disagree (a continue-on-error step, or a payload read
    // mid-transition), and reporting done there would reveal a download button
    // for an artifact that was never produced.
    if (job.conclusion === 'success' && !result.failed) {
      result.done = true;
      result.fraction = 1;
      return result;
    }
    if (!result.failed) {
      // Completed without success and no named step already flagged it —
      // still a failure, not a silent stall at 0%.
      result.failed = true;
    }
  }
  // Clamped only against floating-point drift in the weight sum; the bar may
  // legitimately sit at 100% while the job runs its trailing "Post ..." steps.
  // `done` is what gates the download, and it comes from the job alone.
  result.fraction = Math.min(fraction, 1);
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
    BURN_RENDER_BLOCK: BURN_RENDER_BLOCK,
    renderEtaSeconds: renderEtaSeconds,
    computeProgress: computeProgress,
  };
}
