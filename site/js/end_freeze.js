// End-freeze: decide when to pause the fullscreen preview player just before
// the video ends, so the Vimeo end screen ("more from this user") never
// appears. We have no access to the Vimeo account, so the account-side end
// screen setting is unavailable — the freeze leaves the real last frame on
// screen instead. Single source for browser (script tag) and Node tests.

// The rAF loop polls getCurrentTime() at ~16ms granularity plus postMessage
// latency, so the pause must be requested this far before the end to reliably
// beat the 'ended' event.
var END_FREEZE_EPSILON_SEC = 0.3;

// state: {fsMode, sec, duration, frozen} -> 'freeze' | 'unfreeze' | null.
// The `frozen` latch prevents re-pausing at the freeze point (a viewer who
// presses play may watch the final tail), and is only released once the
// position moves back below the threshold — rewinding re-arms the freeze.
function endFreezeAction(state) {
  if (!state || typeof state.sec !== 'number' || !isFinite(state.sec)) return null;
  var d = state.duration;
  if (typeof d !== 'number' || !isFinite(d) || d <= END_FREEZE_EPSILON_SEC) return null;
  if (state.sec >= d - END_FREEZE_EPSILON_SEC) {
    if (state.frozen) return null;
    return state.fsMode ? 'freeze' : null;
  }
  return state.frozen ? 'unfreeze' : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    END_FREEZE_EPSILON_SEC: END_FREEZE_EPSILON_SEC,
    endFreezeAction: endFreezeAction,
  };
}
