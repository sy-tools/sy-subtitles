// One player interface over the Vimeo SDK and the YouTube IFrame API, for the
// preview and the sync player. Single source: loaded by the browser via
// <script src="js/video_player.js"> in site/index.html AND required by the
// Node test suite (tests/test_video_player.js).
//
// A video is a source from js/vimeo_codec.js decodeVideoSource:
// {provider: 'vimeo' | 'yt' | 'gd', id, watchUrl}. A Drive mirror ('gd') is a
// download for CI, never something the page plays.
//
// Player: {provider, ready(), getCurrentTime(), setCurrentTime(s),
//          getDuration(), getPaused(), getAspect(), play(), pause(),
//          on(event, fn), destroy()} — every getter answers a Promise, as the
// Vimeo SDK's do. Events: play | pause | ended | seeked | timeupdate |
// durationchange | playbackratechange, with Vimeo's payload shapes.

var VIMEO_SDK_URL = 'https://player.vimeo.com/api/player.js';
var YT_API_URL = 'https://www.youtube.com/iframe_api';
var YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

// The YouTube API reports nothing on its own while playing: timeupdate, seeked
// and durationchange come from reading the player on this period — Vimeo's
// own timeupdate rate.
var YT_POLL_MS = 250;
// A position this far from where playback would have carried it since the
// last reading is a seek, made in YouTube's own controls.
var YT_SEEK_JUMP_SEC = 1;
var YT_PLAYING = 1;
var YT_PAUSED = 2;
var YT_ENDED = 0;
var DEFAULT_ASPECT = '16 / 9';
// A YouTube player that has neither answered ready nor reported an error by
// then is not coming: its API loaded, the widget did not. The real one is
// ready in well under a second.
var YT_READY_TIMEOUT_MS = 15000;
// The preview's own chrome: no Vimeo captions under the SPA's overlay, and no
// Transcript panel — in fullscreen it would open over the video, under the
// cursor shield. The sync player keeps Vimeo's bare embed, captions included.
var VIMEO_PREVIEW_PARAMS = 'texttrack=false&transcript=0';

var addQueryParam = typeof withQueryParam === 'function' ? withQueryParam : require('./load_token').withQueryParam;

function isPlayableSource(source) {
  return !!source && (source.provider === 'vimeo' || source.provider === 'yt');
}

function vimeoEmbed(url) {
  // A video with no/undecodable link must not crash the caller, and anything
  // that is not a recognised Vimeo URL yields '' rather than the raw input,
  // which would otherwise reach iframe.src (a javascript:/data:/
  // protocol-relative link from meta.yaml would load/run in the iframe).
  if (!url || typeof url !== 'string') return '';
  var m = url.match(/vimeo\.com\/(\d+)\/([a-f0-9]+)/);
  if (m) return 'https://player.vimeo.com/video/' + m[1] + '?h=' + m[2];
  m = url.match(/vimeo\.com\/(\d+)(?![\/\w])/);
  if (m) return 'https://player.vimeo.com/video/' + m[1];
  return '';
}

// opts: {origin, preview}. origin defaults to the page's: the YouTube player
// only talks to the page it was told about. preview: the preview player's
// embed (VIMEO_PREVIEW_PARAMS) rather than the sync player's.
function embedUrl(source, opts) {
  opts = opts || {};
  var origin = opts.origin;
  if (!source) return '';
  if (source.provider === 'vimeo') {
    var src = vimeoEmbed(source.watchUrl);
    return src && opts.preview ? addQueryParam(src, VIMEO_PREVIEW_PARAMS) : src;
  }
  if (source.provider === 'yt' && YT_ID_RE.test(source.id || '')) {
    if (origin === undefined) origin = typeof location !== 'undefined' ? location.origin : '';
    return 'https://www.youtube.com/embed/' + source.id
      + '?enablejsapi=1&cc_load_policy=0&rel=0&iv_load_policy=3&playsinline=1'
      + '&origin=' + encodeURIComponent(origin);
  }
  return '';
}

// "W / H" -> [W, H], or null when it is not a usable shape.
function parseAspect(aspect) {
  var m = /^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/.exec(aspect || '');
  return m && +m[1] > 0 && +m[2] > 0 ? [+m[1], +m[2]] : null;
}

var ytApiPromise = null;

// The Vimeo SDK is a <script> in index.html's head, so it is either there or
// failed to load. The YouTube API is injected on the first YouTube video
// opened, once.
function loadProviderApi(provider) {
  var g = typeof window !== 'undefined' ? window : {};
  if (provider === 'vimeo') {
    return g.Vimeo ? Promise.resolve(g.Vimeo) : Promise.reject(new Error('Vimeo SDK unavailable'));
  }
  if (provider !== 'yt') return Promise.reject(new Error('no player for provider ' + provider));
  if (g.YT && g.YT.Player) return Promise.resolve(g.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise(function (resolve, reject) {
      var previous = g.onYouTubeIframeAPIReady;
      g.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') previous();
        resolve(g.YT);
      };
      var s = document.createElement('script');
      s.src = YT_API_URL;
      s.async = true;
      s.onerror = function () {
        ytApiPromise = null;
        reject(new Error('YouTube API unavailable'));
      };
      document.head.appendChild(s);
    });
  }
  return ytApiPromise;
}

function createEmitter() {
  var handlers = {};
  return {
    on: function (event, fn) { (handlers[event] = handlers[event] || []).push(fn); },
    emit: function (event, data) {
      (handlers[event] || []).slice().forEach(function (fn) {
        try { fn(data); } catch (e) { if (typeof console !== 'undefined') console.warn('[video_player] ' + event + ' handler:', e); }
      });
    },
  };
}

function createVimeoPlayer(iframe, source, env) {
  var Vimeo = 'Vimeo' in env ? env.Vimeo : (typeof window !== 'undefined' ? window.Vimeo : undefined);
  if (!Vimeo) throw new Error('Vimeo SDK unavailable');
  var p = new Vimeo.Player(iframe);
  return {
    provider: 'vimeo',
    ready: function () { return p.ready(); },
    getCurrentTime: function () { return p.getCurrentTime(); },
    setCurrentTime: function (s) { return p.setCurrentTime(s); },
    getDuration: function () { return p.getDuration(); },
    getPaused: function () { return p.getPaused(); },
    getAspect: function () {
      return Promise.all([p.getVideoWidth(), p.getVideoHeight()]).then(function (wh) {
        return wh[0] > 0 && wh[1] > 0 ? wh[0] + ' / ' + wh[1] : null;
      });
    },
    play: function () { return p.play(); },
    pause: function () { return p.pause(); },
    on: function (event, fn) { p.on(event, fn); },
    destroy: function () { return p.destroy(); },
  };
}

function createYouTubePlayer(iframe, source, env) {
  var g = typeof window !== 'undefined' ? window : {};
  var now = env.now || function () { return Date.now(); };
  var setIntervalFn = env.setInterval || function (fn, ms) { return setInterval(fn, ms); };
  var clearIntervalFn = env.clearInterval || function (id) { clearInterval(id); };
  var fetchFn = env.fetch || (typeof fetch === 'function' ? fetch : null);
  var emitter = createEmitter();
  var yt = null;
  var destroyed = false;
  var pollId = null;
  // Playing as the viewer sees it: a buffering stall inside playback is no
  // new 'play', and only a real start after a stop is.
  var playing = false;
  var last = null; // {t, at, d, playing}

  var setTimeoutFn = env.setTimeout || function (fn, ms) { return setTimeout(fn, ms); };
  var clearTimeoutFn = env.clearTimeout || function (id) { clearTimeout(id); };
  var api = env.YT ? Promise.resolve(env.YT)
    : (env.loadYouTubeApi ? env.loadYouTubeApi() : loadProviderApi('yt'));
  var readyPromise = api.then(function (YT) {
    if (destroyed) throw new Error('YouTube player destroyed before it was built');
    return new Promise(function (resolve, reject) {
      var isReady = false;
      var timer = setTimeoutFn(function () {
        timer = null;
        if (!isReady) reject(new Error('YouTube player did not become ready'));
      }, YT_READY_TIMEOUT_MS);
      function settle() {
        if (timer !== null) { clearTimeoutFn(timer); timer = null; }
      }
      yt = new YT.Player(iframe, {
        events: {
          onReady: function () {
            isReady = true;
            settle();
            if (!destroyed) pollId = setIntervalFn(poll, YT_POLL_MS);
            resolve();
          },
          onError: function (e) {
            if (isReady) return;
            settle();
            reject(new Error('YouTube player error ' + (e && e.data)));
          },
          onStateChange: function (e) { onState(e && e.data); },
          onPlaybackRateChange: function (e) {
            emitter.emit('playbackratechange', { playbackRate: e && e.data });
          },
        },
      });
    });
  });
  // A rejection nobody asked about yet must not surface as unhandled.
  readyPromise.catch(function () {});

  function onState(state) {
    if (state === YT_PLAYING) {
      // cc_load_policy=0 does not keep YouTube's own captions off (measured
      // 2026-11-23: they showed under ours); the captions module loads with
      // playback, so it is unloaded each time playback starts.
      try { yt.unloadModule('captions'); } catch (e) { /* no captions module */ }
      if (!playing) { playing = true; emitter.emit('play', { seconds: yt.getCurrentTime() }); }
    } else if (state === YT_PAUSED) {
      if (playing) { playing = false; emitter.emit('pause', { seconds: yt.getCurrentTime() }); }
    } else if (state === YT_ENDED) {
      playing = false;
      emitter.emit('ended', { seconds: yt.getCurrentTime() });
    }
  }

  function stopPolling() {
    if (pollId !== null) { clearIntervalFn(pollId); pollId = null; }
  }

  function poll() {
    if (destroyed || !yt) return;
    // The preview swaps the iframe out on a video switch without destroying
    // the player; a poll left running would read a dead player forever.
    var frame = yt.getIframe ? yt.getIframe() : null;
    if (frame && frame.isConnected === false) { stopPolling(); return; }
    var t = yt.getCurrentTime();
    var d = yt.getDuration();
    var at = now();
    var isPlaying = yt.getPlayerState() === YT_PLAYING;
    if (d > 0 && (!last || d !== last.d)) emitter.emit('durationchange', { duration: d });
    if (last) {
      var rate = (yt.getPlaybackRate && yt.getPlaybackRate()) || 1;
      var expected = last.t + (last.playing ? (at - last.at) / 1000 * rate : 0);
      if (Math.abs(t - expected) > YT_SEEK_JUMP_SEC) emitter.emit('seeked', { seconds: t, duration: d });
    }
    if (!last || t !== last.t) emitter.emit('timeupdate', { seconds: t, duration: d });
    last = { t: t, at: at, d: d > 0 ? d : (last ? last.d : 0), playing: isPlaying };
  }

  function whenReady(fn) {
    return readyPromise.then(function () { return fn(yt); });
  }

  return {
    provider: 'yt',
    ready: function () { return readyPromise; },
    getCurrentTime: function () { return whenReady(function (p) { return p.getCurrentTime(); }); },
    setCurrentTime: function (s) {
      return whenReady(function (p) {
        p.seekTo(s, true);
        if (last) last = { t: s, at: now(), d: last.d, playing: last.playing };
        emitter.emit('seeked', { seconds: s, duration: p.getDuration() });
        return s;
      });
    },
    getDuration: function () { return whenReady(function (p) { return p.getDuration(); }); },
    getPaused: function () { return whenReady(function (p) { return p.getPlayerState() !== YT_PLAYING; }); },
    getAspect: function () {
      if (!fetchFn) return Promise.resolve(DEFAULT_ASPECT);
      // maxwidth/maxheight: the default answer is a 200px-wide thumbnail size,
      // whose rounded height (113 for 16:9) is not the video's ratio.
      var url = 'https://www.youtube.com/oembed?format=json&maxwidth=1920&maxheight=1080&url='
        + encodeURIComponent(source.watchUrl);
      return Promise.resolve()
        .then(function () { return fetchFn(url); })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          return j && j.width > 0 && j.height > 0 ? j.width + ' / ' + j.height : DEFAULT_ASPECT;
        }, function () { return DEFAULT_ASPECT; });
    },
    play: function () { return whenReady(function (p) { p.playVideo(); }); },
    pause: function () { return whenReady(function (p) { p.pauseVideo(); }); },
    on: emitter.on,
    destroy: function () {
      destroyed = true;
      stopPolling();
      if (yt) { try { yt.destroy(); } catch (e) { /* already gone */ } }
      return Promise.resolve();
    },
  };
}

// env (tests): {Vimeo, YT, loadYouTubeApi, fetch, now, setInterval,
// clearInterval, setTimeout, clearTimeout}; the page's
// globals otherwise. Throws for a source that has no player, and — as
// `new Vimeo.Player` does — when the Vimeo SDK is missing or refuses.
function createVideoPlayer(iframe, source, env) {
  env = env || {};
  if (!isPlayableSource(source)) throw new Error('no player for this video');
  return source.provider === 'yt'
    ? createYouTubePlayer(iframe, source, env)
    : createVimeoPlayer(iframe, source, env);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VIMEO_SDK_URL: VIMEO_SDK_URL,
    YT_API_URL: YT_API_URL,
    YT_POLL_MS: YT_POLL_MS,
    YT_SEEK_JUMP_SEC: YT_SEEK_JUMP_SEC,
    YT_READY_TIMEOUT_MS: YT_READY_TIMEOUT_MS,
    VIMEO_PREVIEW_PARAMS: VIMEO_PREVIEW_PARAMS,
    isPlayableSource: isPlayableSource,
    vimeoEmbed: vimeoEmbed,
    embedUrl: embedUrl,
    parseAspect: parseAspect,
    loadProviderApi: loadProviderApi,
    createVideoPlayer: createVideoPlayer,
  };
}
