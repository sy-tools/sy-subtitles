// End-freeze: decide when to pause the preview player — embedded or
// fullscreen alike — just before the video ends, so the player's end screen
// (Vimeo's "more from this user", YouTube's replay screen) never appears. We have no access to the Vimeo
// account, so the account-side end screen setting is unavailable — the freeze
// leaves the real last frame on screen instead. Single source for browser
// (script tag) and Node tests.

// The rAF loop polls getCurrentTime() at ~16ms granularity plus postMessage
// latency, so the pause must be requested this far before the end to reliably
// beat the 'ended' event.
var END_FREEZE_EPSILON_SEC = 0.3;

// Per player (js/video_player.js `provider`). YouTube, measured 2026-11-23 on
// a real embed: getCurrentTime() moves every animation frame (~16 ms steps,
// no coarser than Vimeo's), and the 'ended' state lands at the true media
// end with nothing before it — so the same window beats it.
var END_FREEZE_EPSILON_BY_PROVIDER = { vimeo: END_FREEZE_EPSILON_SEC, yt: 0.3 };

// state: {sec, duration, frozen, provider} -> 'freeze' | 'unfreeze' | null. No view
// mode: the end screen shows in the embedded player as much as in fullscreen.
// The `frozen` latch prevents re-pausing at the freeze point (a viewer who
// presses play may watch the final tail), and is only released once the
// position moves back below the threshold — rewinding re-arms the freeze.
function endFreezeAction(state) {
  if (!state || typeof state.sec !== 'number' || !isFinite(state.sec)) return null;
  var eps = END_FREEZE_EPSILON_BY_PROVIDER[state.provider] || END_FREEZE_EPSILON_SEC;
  var d = state.duration;
  if (typeof d !== 'number' || !isFinite(d) || d <= eps) return null;
  if (state.sec >= d - eps) {
    if (state.frozen) return null;
    return 'freeze';
  }
  return state.frozen ? 'unfreeze' : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    END_FREEZE_EPSILON_SEC: END_FREEZE_EPSILON_SEC,
    END_FREEZE_EPSILON_BY_PROVIDER: END_FREEZE_EPSILON_BY_PROVIDER,
    endFreezeAction: endFreezeAction,
  };
}
