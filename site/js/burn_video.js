// Burned-in subtitle rendering: triggers burn-subtitles.yml, follows the run,
// and turns the resulting artifact into a plain .mp4 download.
//
// Logic lives here (and is unit-tested by tests/test_burn_video.js); index.html
// only wires it to the DOM — the single-source pattern used by preview_state.js.

var BURN_WORKFLOW = 'burn-subtitles.yml';

// The branch whose burn-subtitles.yml actually runs. Production always wants
// the default branch, but a workflow change cannot be exercised from the UI
// until it is ON that branch — so a run dispatched while testing would execute
// the OLD file and silently prove nothing. `window.__SY_BURN_REF` lets a local
// stand point at the branch under test; the same runtime-hook pattern as
// __SY_GH_EXCHANGE_URL, and it never ships (nothing sets it in the page).
var BURN_DEFAULT_REF = 'main';

function burnRef(win) {
  var w = win || (typeof window !== 'undefined' ? window : null);
  var ref = w && w.__SY_BURN_REF;
  return (typeof ref === 'string' && ref) ? ref : BURN_DEFAULT_REF;
}

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

// The band the workflow's "Validate inputs" step accepts for font_ratio
// (.github/workflows/burn-subtitles.yml). The subtitle resize handle allows
// --preview-subs-scale from 0.5 to 4, and past ~1.69x the measurement leaves
// this band — so without a clamp here an enlarged preview dispatches a run that
// dies minutes later in validation.
//
// The clamp is silent, which is acceptable only because it is exactly what
// tools/burn_subtitles.py already does to the same value (FONT_RATIO_MIN /
// FONT_RATIO_MAX there, applied in ass_font_size): the burned output is
// identical whether the ratio is clamped here or there. Keep all three in step —
// tests/test_burn_workflow.py pins the numbers across the three files.
var FONT_RATIO_MIN = 0.02;
var FONT_RATIO_MAX = 0.12;

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
    font_ratio: clampNum(FONT_RATIO_MIN,
                         fullscreenFontPx(vw, vh, g.subsScale) / shown,
                         FONT_RATIO_MAX),
    padtop_ratio: FS_PADTOP_PX / shown,
    padbot_ratio: FS_PADBOT_PX / shown,
  };
}

// Weights per workflow step. Names must match burn-subtitles.yml exactly —
// tests/test_burn_workflow_steps.py pins the two files against each other.
//
// The nineteen "Render NN%" entries and "Finish render" are not work in their
// own right: each is a step that blocks until the detached ffmpeg encode passes
// that percentage (tools/render_gate.py). A step COMPLETING is the only live,
// CORS-clean signal a browser has into a running job, and it is one the SPA
// already polls — so the render percentage below is ffmpeg's own, not a guess.
//
// The grid is 5%, not 10%: a real run measured 33.0 Mpixel/s, i.e. 4.29x
// realtime at the 640x480 the corpus's longest talks resolve to, so its
// 213-minute talk encodes in ~50 minutes. At ten gates that is ~5.5 minutes of
// a motionless bar per tick; at twenty it is ~2.75, and a typical 60-minute
// talk ticks about every 45 s. Each gate step costs about a second of runner
// overhead, which is nothing against an encode of that length.
//
// Written out literally on purpose: a generated `Render NN%` loop would be
// clever and would hide a typo'd name behind matching-but-wrong output.
var BURN_STEP_WEIGHTS = [
  { name: 'Install dependencies', weight: 0.05 },
  { name: 'Download video', weight: 0.15 },
  { name: 'Start render', weight: 0.05 },
  { name: 'Render 5%', weight: 0.0325 },
  { name: 'Render 10%', weight: 0.0325 },
  { name: 'Render 15%', weight: 0.0325 },
  { name: 'Render 20%', weight: 0.0325 },
  { name: 'Render 25%', weight: 0.0325 },
  { name: 'Render 30%', weight: 0.0325 },
  { name: 'Render 35%', weight: 0.0325 },
  { name: 'Render 40%', weight: 0.0325 },
  { name: 'Render 45%', weight: 0.0325 },
  { name: 'Render 50%', weight: 0.0325 },
  { name: 'Render 55%', weight: 0.0325 },
  { name: 'Render 60%', weight: 0.0325 },
  { name: 'Render 65%', weight: 0.0325 },
  { name: 'Render 70%', weight: 0.0325 },
  { name: 'Render 75%', weight: 0.0325 },
  { name: 'Render 80%', weight: 0.0325 },
  { name: 'Render 85%', weight: 0.0325 },
  { name: 'Render 90%', weight: 0.0325 },
  { name: 'Render 95%', weight: 0.0325 },
  { name: 'Finish render', weight: 0.0325 },
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

// ------------------------------------------------------------------
// Four phases, not fourteen steps.
//
// Fourteen uniform ticks say nothing true about the wait: three of the steps
// are short certainties and one is a twenty-minute stretch. The panel draws one
// segment per phase, width proportional to phase weight, so the form itself
// says "three quick things, then one patient one" — and the English Actions
// step names never reach the Ukrainian UI, because a phase has its own name.
// ------------------------------------------------------------------
var BURN_PHASE_PREPARE = 'Install dependencies';
var BURN_PHASE_FETCH = 'Download video';

// Named workflow steps that carry NO weight but still belong to a phase.
//
// 'Validate inputs' is the whole reason this table exists: it is the one step
// whose job is to report bad user input, and without an entry here its failure
// would be the one failure the panel could not name. Deliberately NOT an entry
// in BURN_STEP_WEIGHTS — that table's sum, its order and its name-for-name
// contract with burn-subtitles.yml are pinned by
// tests/test_burn_workflow_steps.py, which lists the same step under
// UNWEIGHTED_STEPS.
var BURN_STEP_PHASE_ALIASES = [
  { name: 'Validate inputs', phase: 'prepare' }
];

function burnAliasPhase(stepName) {
  for (var i = 0; i < BURN_STEP_PHASE_ALIASES.length; i++) {
    if (BURN_STEP_PHASE_ALIASES[i].name === stepName) {
      return BURN_STEP_PHASE_ALIASES[i].phase;
    }
  }
  return null;
}

// Derived from BURN_STEP_WEIGHTS on every call, never hardcoded and never
// cached: the weight table is the single source of truth, and a stale cache
// would let the drawn widths drift away from the workflow.
function burnPhases() {
  var prepare = burnStepIndex(BURN_PHASE_PREPARE);
  var fetch = burnStepIndex(BURN_PHASE_FETCH);
  var first = burnStepIndex(BURN_RENDER_BLOCK.firstStep);
  var last = burnStepIndex(BURN_RENDER_BLOCK.lastStep);
  // Four confidently-drawn wrong widths would be worse than a crash: throw so
  // a future weight-table change is a loud failure, not a quiet lie.
  if (prepare !== 0 || fetch !== 1 || first !== 2 || last <= first
      || last >= BURN_STEP_WEIGHTS.length - 1) {
    throw new Error('burn: BURN_STEP_WEIGHTS no longer groups into four phases');
  }
  var groups = [
    { key: 'prepare', from: prepare, to: fetch },
    { key: 'fetch', from: fetch, to: first },
    { key: 'render', from: first, to: last + 1 },
    { key: 'upload', from: last + 1, to: BURN_STEP_WEIGHTS.length }
  ];
  var phases = [];
  var start = 0;
  for (var g = 0; g < groups.length; g++) {
    var steps = BURN_STEP_WEIGHTS.slice(groups[g].from, groups[g].to);
    var weight = 0;
    var names = [];
    for (var s = 0; s < steps.length; s++) {
      weight += steps[s].weight;
      names.push(steps[s].name);
    }
    phases.push({ key: groups[g].key, weight: weight, start: start,
                  stepNames: names });
    start += weight;
  }
  return phases;
}

// Which phase a workflow step belongs to, or null for steps that are not ours
// ('Set up job', the trailing 'Post ...' steps). null is what stops the panel
// from claiming a phase is running when nothing of ours is.
// The runner brackets every job with its own steps: 'Set up job' first, and a
// 'Post <action>' for each action that registered cleanup, AFTER our last step.
// They are never evidence that the workflow is not ours.
function isRunnerStep(stepName) {
  return stepName === 'Set up job'
    || stepName === 'Complete job'
    || /^Post /.test(stepName)
    || /^Run actions\//.test(stepName);
}

function burnPhaseKey(stepName) {
  if (!stepName) return null;
  var phases = burnPhases();
  for (var i = 0; i < phases.length; i++) {
    if (phases[i].stepNames.indexOf(stepName) > -1) return phases[i].key;
  }
  return burnAliasPhase(stepName);
}

// 1-based position of the phase whose step is running — the "step 3 of 4"
// landmark the status line is built around. null when no phase of ours is
// running.
function burnPhaseNumber(progress) {
  var key = burnPhaseKey(progress && progress.label);
  if (!key) return null;
  var phases = burnPhases();
  for (var i = 0; i < phases.length; i++) {
    if (phases[i].key === key) return i + 1;
  }
  return null;
}

// Per-segment geometry and state for one poll's worth of progress.
//
// A phase fills only with weight credited to its OWN steps, so the render
// segment advances in ten crisp gate increments while the segments around it
// stay put. Exactly one phase can be 'active' and at most one 'failed'.
function burnSegments(progress) {
  var p = progress || {};
  var fraction = Number(p.fraction) || 0;
  var activeKey = (p.done || p.failed) ? null : burnPhaseKey(p.label);
  // An empty failedStep means the job died somewhere we cannot name (before any
  // named step, say). We do not know where, so we mark nothing.
  var failedKey = (p.failed && p.failedStep) ? burnPhaseKey(p.failedStep) : null;
  var segments = burnPhases().map(function(phase) {
    var full = phase.start + phase.weight;
    // The epsilon is float hygiene, not slack. computeProgress clamps the
    // all-steps-complete sum to 0.9999999999999997, and at that instant `label`
    // is still 'Upload result' — so without it the last segment would breathe
    // as 'active' over a visually full fill instead of settling to 'done'.
    var fill = (p.done || fraction >= full - 1e-9)
      ? 1
      : clampNum(0, (fraction - phase.start) / phase.weight, 1);
    var state = 'idle';
    if (phase.key === failedKey) state = 'failed';
    else if (fill >= 1) state = 'done';
    else if (phase.key === activeKey) state = 'active';
    return { key: phase.key, weight: phase.weight, start: phase.start,
             fill: fill, state: state };
  });
  // The run-discovery window: dispatched, but the API names no step of ours yet,
  // and that lasts up to a minute. An inert track reads as broken, so the phase
  // about to run becomes the active one. Terminal states are excluded — a
  // failure we cannot locate must not breathe an arbitrary phase.
  var idle = !p.done && !p.failed && segments.every(function(s) {
    return s.state === 'idle';
  });
  if (idle) segments[0].state = 'active';
  return segments;
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
                 failedStep: '', renderFraction: null, renderStartedMs: null,
                 startedMs: null, unknownStep: '' };
  var steps = (job && job.steps) || [];
  var byName = {};
  for (var i = 0; i < steps.length; i++) {
    if (steps[i] && steps[i].name) byName[steps[i].name] = steps[i];
  }

  // When OUR work began, as the API reports it — not when this browser tab
  // dispatched, which a reload or a second device would get wrong. Runner
  // overhead ('Set up job') is excluded: it is not part of the wait we promised.
  for (var b = 0; b < BURN_STEP_WEIGHTS.length; b++) {
    var began = byName[BURN_STEP_WEIGHTS[b].name];
    // Date.parse('') is NaN, which || turns into null.
    var beganMs = began ? (Date.parse(began.started_at || '') || null) : null;
    if (beganMs !== null && (result.startedMs === null || beganMs < result.startedMs)) {
      result.startedMs = beganMs;
    }
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

  // A step of OURS that is running names the phase. When none is, the loop
  // above has left `label` on the last COMPLETED step — which reads as "that
  // phase is running" and is a lie for as long as the unknown step takes. It
  // happens whenever the dispatched workflow is not the one this table
  // describes (a placeholder on the default branch, a rename, a version skew
  // between the SPA and the workflow file). Report the step we do not know
  // instead of borrowing a name we do: the credited fraction stays honest
  // either way, and silence beats a confident wrong phase.
  if (!result.failed) {
    var named = byName[result.label];
    if (!named || named.status !== 'in_progress') {
      var running = null;
      for (var r = 0; r < steps.length; r++) {
        if (steps[r] && steps[r].status === 'in_progress') { running = steps[r]; break; }
      }
      // 'Set up job' and the trailing 'Post ...' steps belong to the runner and
      // bracket every job — they are not evidence of an unrecognised workflow.
      if (running && !isRunnerStep(running.name) && !burnPhaseKey(running.name)) {
        result.label = '';
        result.unknownStep = running.name;
      }
    }
  }

  // The weighted loop above cannot see a weightless step, so a run rejected in
  // 'Validate inputs' would arrive as "failed, we cannot say where". It maps to
  // a phase (BURN_STEP_PHASE_ALIASES), so name it — and still credit it nothing.
  if (!result.failed) {
    for (var a = 0; a < BURN_STEP_PHASE_ALIASES.length; a++) {
      var alias = byName[BURN_STEP_PHASE_ALIASES[a].name];
      if (alias && (alias.conclusion === 'failure' || alias.conclusion === 'cancelled')) {
        result.failed = true;
        result.failedStep = BURN_STEP_PHASE_ALIASES[a].name;
        break;
      }
    }
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
    BURN_DEFAULT_REF: BURN_DEFAULT_REF,
    burnRef: burnRef,
    BURN_RATIO_KEYS: BURN_RATIO_KEYS,
    makeRequestId: makeRequestId,
    buildBurnInputs: buildBurnInputs,
    matchRun: matchRun,
    burnStateKey: burnStateKey,
    FONT_RATIO_MIN: FONT_RATIO_MIN,
    FONT_RATIO_MAX: FONT_RATIO_MAX,
    FS_FONT_MAX_PX: FS_FONT_MAX_PX,
    FS_PADTOP_PX: FS_PADTOP_PX,
    FS_PADBOT_PX: FS_PADBOT_PX,
    fullscreenFontPx: fullscreenFontPx,
    displayedVideoHeight: displayedVideoHeight,
    measureBurnRatios: measureBurnRatios,
    BURN_STEP_WEIGHTS: BURN_STEP_WEIGHTS,
    BURN_RENDER_BLOCK: BURN_RENDER_BLOCK,
    burnPhases: burnPhases,
    burnPhaseKey: burnPhaseKey,
    burnPhaseNumber: burnPhaseNumber,
    burnSegments: burnSegments,
    renderEtaSeconds: renderEtaSeconds,
    computeProgress: computeProgress,
  };
}
