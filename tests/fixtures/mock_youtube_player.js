// Mock YouTube IFrame API for tests: stands in for https://www.youtube.com/iframe_api
// (the E2E suites route that URL here) and for window.YT in the Node unit tests.
//
// It exposes the same TEST HANDLE as tests/fixtures/mock_vimeo_player.js —
// window._vimeoPlayer, window.__mockPlayers, _setTime, _setMediaDuration,
// _fire, _currentTime, _paused, play(), pause() — so an E2E suite drives
// either provider with the same calls. Like the real API, time does not flow
// by itself and nothing reports it: the SPA's adapter (site/js/video_player.js)
// polls getCurrentTime()/getDuration() and synthesises timeupdate, seeked and
// durationchange from what it reads.
(function (win) {
  var STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
  var later = win.setTimeout ? win.setTimeout.bind(win) : setTimeout;

  function Player(element, options) {
    if (win.__mockPlayerThrows) throw new Error('mock: the API could not build a player');
    this._events = (options && options.events) || {};
    this._currentTime = 0;
    // getDuration() before playback loads the media answers the metadata
    // length rounded to whole seconds, as the real one does (measured
    // 2026-11-23: 371, then 370.2654 once playing).
    this._duration = 3600;
    this._state = STATE.UNSTARTED;
    this._rate = 1;
    this._unloaded = [];
    this._destroyed = false;
    this._src = element && element.getAttribute ? element.getAttribute('src') : null;
    if (typeof document !== 'undefined' && element && element.parentNode) {
      var div = document.createElement('div');
      div.id = 'mock-player';
      div.style.cssText = 'width:100%;height:100%;min-height:40px;background:#222;display:flex;align-items:center;justify-content:center;color:#666;font-size:14px;';
      div.textContent = 'Mock YouTube Player';
      element.parentNode.replaceChild(div, element);
      this._el = div;
    }
    win._vimeoPlayer = this;
    (win.__mockPlayers = win.__mockPlayers || []).push(this);
    var self = this;
    if (!win.__mockReadyHeld) {
      later(function () { self._settleReady(!win.__mockReadyReject); }, 0);
    }
  }
  Player.prototype = {
    // A test holding ready (window.__mockReadyHeld) settles it itself.
    _settleReady: function (ok) {
      if (ok) { if (this._events.onReady) this._events.onReady({ target: this }); }
      else if (this._events.onError) this._events.onError({ target: this, data: 150 });
    },
    _stateTo: function (s) {
      this._state = s;
      if (this._events.onStateChange) this._events.onStateChange({ target: this, data: s });
    },
    getCurrentTime: function () { return this._currentTime; },
    getDuration: function () { return this._duration; },
    getPlayerState: function () { return this._state; },
    getPlaybackRate: function () { return this._rate; },
    setPlaybackRate: function (r) {
      this._rate = r;
      if (this._events.onPlaybackRateChange) this._events.onPlaybackRateChange({ target: this, data: r });
    },
    seekTo: function (sec) { this._currentTime = sec; },
    playVideo: function () { if (this._state !== STATE.PLAYING) this._stateTo(STATE.PLAYING); },
    pauseVideo: function () { if (this._state === STATE.PLAYING) this._stateTo(STATE.PAUSED); },
    unloadModule: function (name) { this._unloaded.push(name); },
    getIframe: function () { return this._el || null; },
    destroy: function () { this._destroyed = true; },
    // --- test handle, shared with the Vimeo mock ---
    play: function () { this.playVideo(); },
    pause: function () { this.pauseVideo(); },
    get _paused() { return this._state !== STATE.PLAYING; },
    set _paused(v) { this._state = v ? STATE.PAUSED : STATE.PLAYING; },
    _setTime: function (seconds) { this._currentTime = seconds; },
    _setMediaDuration: function (seconds) { this._duration = seconds; },
    _fire: function (event, data) {
      if (event === 'play') this._stateTo(STATE.PLAYING);
      else if (event === 'pause') this._stateTo(STATE.PAUSED);
      else if (event === 'ended') this._stateTo(STATE.ENDED);
      else if (event === 'playbackratechange') this.setPlaybackRate((data && data.playbackRate) || 1);
      else if (event === 'durationchange') this._duration = data.duration;
      else if (event === 'timeupdate') this._currentTime = data.seconds;
    },
  };

  win.YT = { Player: Player, PlayerState: STATE };
  // The real script calls this once the API is ready.
  if (typeof win.onYouTubeIframeAPIReady === 'function') {
    later(function () { win.onYouTubeIframeAPIReady(); }, 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);
