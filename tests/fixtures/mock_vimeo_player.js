// Mock Vimeo Player SDK for E2E testing.
// Intercepts the real player.js and provides controllable time simulation.
window.Vimeo = {
  Player: class {
    constructor(element) {
      if (window.__mockPlayerThrows) throw new Error('mock: the SDK could not build a player');
      this._currentTime = 0;
      this._duration = 3600;
      this._callbacks = {};
      // The embed URL the SPA gave the player, for tests of the player's options.
      this._src = element && element.getAttribute ? element.getAttribute('src') : null;
      // Replace the iframe with a visible div that honors the real CSS
      // layout around it (width/height inherited via 100% from the mount).
      // A tiny min-height keeps the mock reachable even when the mount
      // point has collapsed due to a layout bug — but tests that assert
      // on dimensions can still detect the collapse.
      var div = document.createElement('div');
      div.id = 'mock-player';
      div.style.cssText = 'width:100%;height:100%;min-height:40px;background:#222;display:flex;align-items:center;justify-content:center;color:#666;font-size:14px;';
      div.textContent = 'Mock Vimeo Player';
      if (element && element.parentNode) {
        // Do NOT override the parent's inline style — let CSS decide the
        // box so regressions in layout surface through the mock.
        element.parentNode.replaceChild(div, element);
      } else {
        document.body.appendChild(div);
      }
      window._vimeoPlayer = this;
      (window.__mockPlayers = window.__mockPlayers || []).push(this);
    }
    // A test fails the load with window.__mockReadyReject, or with
    // window.__mockReadyHeld settles each player's ready() itself, via _settle.
    ready() {
      if (window.__mockReadyReject) return Promise.reject(new Error('mock: the player failed to load'));
      if (!window.__mockReadyHeld) return Promise.resolve();
      var self = this;
      if (!self._held) self._held = new Promise(function(resolve, reject) { self._settle = {resolve: resolve, reject: reject}; });
      return self._held;
    }
    pause() {
      var wasPaused = this._paused !== false;
      this._paused = true;
      if (!wasPaused) this._fire('pause', {});
      return Promise.resolve();
    }
    play() {
      var wasPaused = this._paused !== false;
      this._paused = false;
      if (wasPaused) this._fire('play', {});
      return Promise.resolve();
    }
    getPaused() { return Promise.resolve(this._paused !== false); }
    setCurrentTime(sec) { this._currentTime = sec; return Promise.resolve(); }
    on(event, callback) {
      this._callbacks[event] = this._callbacks[event] || [];
      this._callbacks[event].push(callback);
    }
    getCurrentTime() { return Promise.resolve(this._currentTime); }
    // The metadata length, as Vimeo's getDuration() reports it at ready (the
    // SPA asks it then), before playback loads the media: a whole number of seconds
    // that can run past the media's true end (see _setMediaDuration). A test
    // delays the answer with window.__mockDurationDelayMs and waits on
    // window.__mockDurationAnswered to know it has landed.
    getDuration() {
      var d = this._duration, ms = window.__mockDurationDelayMs;
      if (!ms) return Promise.resolve(d);
      return new Promise(function(resolve) {
        setTimeout(function() { resolve(d); }, ms);
      }).then(function(v) {
        // Flagged on a later task, so the SPA's own .then has run first.
        setTimeout(function() { window.__mockDurationAnswered = true; }, 0);
        return v;
      });
    }
    // Intrinsic size; a test picks another shape via window.__mockVideoSize.
    getVideoWidth() { return Promise.resolve((window.__mockVideoSize || [1280, 720])[0]); }
    getVideoHeight() { return Promise.resolve((window.__mockVideoSize || [1280, 720])[1]); }
    _fire(event, data) {
      var cbs = this._callbacks[event] || [];
      for (var i = 0; i < cbs.length; i++) cbs[i](data);
    }
    // Test helper: the media's true length arrives, as Vimeo's 'durationchange'
    // does once playback loads the media. (The real getDuration() also answers
    // with it from then on; this mock keeps the metadata, as the SPA only asks
    // at ready.)
    _setMediaDuration(seconds) {
      this._fire('durationchange', { duration: seconds });
    }
    // Test helper: set time and fire timeupdate
    _setTime(seconds) {
      this._currentTime = seconds;
      this._fire('timeupdate', { seconds: seconds, duration: 3600 });
    }
  }
};
