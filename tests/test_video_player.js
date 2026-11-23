// The provider adapter behind the preview and sync players (site/js/video_player.js).
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  embedUrl,
  vimeoEmbed,
  createVideoPlayer,
  isPlayableSource,
  parseAspect,
  YT_POLL_MS,
  YT_READY_TIMEOUT_MS,
  YT_SEEK_HOLD_MS,
} = require('../site/js/video_player.js');

const ORIGIN = 'https://sy-tools.github.io';
const YT_SOURCE = { provider: 'yt', id: 'AbCdEfGhIjK', watchUrl: 'https://www.youtube.com/watch?v=AbCdEfGhIjK' };
const VIMEO_SOURCE = { provider: 'vimeo', id: '123456/abcdef', watchUrl: 'https://vimeo.com/123456/abcdef' };
const GD_SOURCE = { provider: 'gd', id: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', watchUrl: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view' };

function loadMock(file, extra) {
  const win = Object.assign({ setTimeout, clearTimeout }, extra || {});
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8'),
    Object.assign({ window: win, setTimeout, clearTimeout, console }, extra || {}),
  );
  return win;
}

// Manual clock + interval for the YouTube poll.
function fakeTimers() {
  const t = { nowMs: 0, fns: [], timeouts: [] };
  t.env = {
    now: () => t.nowMs,
    setInterval: (fn) => { t.fns.push(fn); return t.fns.length; },
    clearInterval: (id) => { t.fns[id - 1] = null; },
    setTimeout: (fn, ms) => { t.timeouts.push({ fn, at: t.nowMs + ms }); return t.timeouts.length; },
    clearTimeout: (id) => { if (id) t.timeouts[id - 1] = null; },
  };
  t.advance = (ms) => {
    t.nowMs += ms;
    t.timeouts.forEach((o, i) => { if (o && o.at <= t.nowMs) { t.timeouts[i] = null; o.fn(); } });
  };
  t.tick = (ms) => {
    t.nowMs += ms === undefined ? YT_POLL_MS : ms;
    t.fns.forEach((fn) => fn && fn());
  };
  return t;
}

function ytPlayer(extraEnv) {
  const win = loadMock('mock_youtube_player.js');
  const timers = fakeTimers();
  const env = Object.assign({ YT: win.YT, fetch: () => Promise.reject(new Error('offline')) }, timers.env, extraEnv || {});
  const player = createVideoPlayer({ getAttribute: () => null }, YT_SOURCE, env);
  return { win, timers, player, mock: () => win._vimeoPlayer };
}

function record(player, events) {
  const seen = [];
  events.forEach((ev) => player.on(ev, (data) => seen.push([ev, data])));
  return seen;
}

describe('embedUrl', () => {
  it("builds the preview's Vimeo embed with captions and the transcript panel off", () => {
    assert.strictEqual(embedUrl(VIMEO_SOURCE, { origin: ORIGIN, preview: true }),
      'https://player.vimeo.com/video/123456?h=abcdef&texttrack=false&transcript=0');
    assert.strictEqual(embedUrl({ provider: 'vimeo', id: '123456', watchUrl: 'https://vimeo.com/123456' }, { origin: ORIGIN, preview: true }),
      'https://player.vimeo.com/video/123456?texttrack=false&transcript=0');
  });

  it("keeps the sync player's Vimeo embed bare, so Vimeo's own captions stay available there", () => {
    assert.strictEqual(embedUrl(VIMEO_SOURCE, { origin: ORIGIN }), 'https://player.vimeo.com/video/123456?h=abcdef');
    assert.strictEqual(embedUrl({ provider: 'vimeo', id: '123456', watchUrl: 'https://vimeo.com/123456' }),
      'https://player.vimeo.com/video/123456');
  });

  it('builds the YouTube embed with the JS API on, captions, related videos and annotations off', () => {
    const yt = 'https://www.youtube.com/embed/AbCdEfGhIjK?enablejsapi=1&cc_load_policy=0&rel=0'
      + '&iv_load_policy=3&playsinline=1&origin=' + encodeURIComponent(ORIGIN);
    assert.strictEqual(embedUrl(YT_SOURCE, { origin: ORIGIN }), yt);
    assert.strictEqual(embedUrl(YT_SOURCE, { origin: ORIGIN, preview: true }), yt);
  });

  it('builds nothing for a Drive mirror, which has no player', () => {
    assert.strictEqual(embedUrl(GD_SOURCE, { origin: ORIGIN }), '');
  });

  it('builds nothing for garbage', () => {
    [null, undefined, {}, { provider: 'yt' }, { provider: 'yt', id: 'x"><script>' },
      { provider: 'vimeo', watchUrl: 'javascript:alert(1)' }, { provider: 'evil', id: 'AbCdEfGhIjK' }]
      .forEach((s) => assert.strictEqual(embedUrl(s, { origin: ORIGIN, preview: true }), '', JSON.stringify(s)));
  });
});

describe('vimeoEmbed — only ever yields a player.vimeo.com embed URL', () => {
  it('rejects javascript:, data: and protocol-relative urls', () => {
    ['javascript:alert(1)', 'data:text/html,x', undefined, null, 'not a url']
      .forEach((u) => assert.strictEqual(vimeoEmbed(u), ''));
  });
});

describe('isPlayableSource', () => {
  it('plays Vimeo and YouTube, not Drive or nothing', () => {
    assert.strictEqual(isPlayableSource(VIMEO_SOURCE), true);
    assert.strictEqual(isPlayableSource(YT_SOURCE), true);
    assert.strictEqual(isPlayableSource(GD_SOURCE), false);
    assert.strictEqual(isPlayableSource(null), false);
  });
});

describe('parseAspect', () => {
  it('reads "W / H" into numbers, and nothing else', () => {
    assert.deepStrictEqual(parseAspect('1440 / 1080'), [1440, 1080]);
    assert.strictEqual(parseAspect(''), null);
    assert.strictEqual(parseAspect('0 / 9'), null);
    assert.strictEqual(parseAspect(null), null);
  });
});

describe('createVideoPlayer — Vimeo', () => {
  function vimeoPlayer() {
    const win = loadMock('mock_vimeo_player.js', {
      document: { createElement: () => ({ style: {} }), body: { appendChild() {} } },
    });
    const player = createVideoPlayer({ getAttribute: () => 'src' }, VIMEO_SOURCE, { Vimeo: win.Vimeo });
    return { win, player, mock: win._vimeoPlayer };
  }

  it('is a pass-through to the Vimeo SDK player', async () => {
    const { player, mock } = vimeoPlayer();
    assert.strictEqual(player.provider, 'vimeo');
    await player.ready();
    await player.setCurrentTime(42);
    assert.strictEqual(await player.getCurrentTime(), 42);
    assert.strictEqual(await player.getDuration(), 3600);
    await player.play();
    assert.strictEqual(await player.getPaused(), false);
    const seen = [];
    player.on('timeupdate', (d) => seen.push(d.seconds));
    mock._setTime(7);
    assert.deepStrictEqual(seen, [7]);
  });

  it('reports the aspect from the intrinsic size', async () => {
    const { player } = vimeoPlayer();
    assert.strictEqual(await player.getAspect(), '1280 / 720');
  });

  it('throws when the SDK is missing, as the call sites expect', () => {
    assert.throws(() => createVideoPlayer({}, VIMEO_SOURCE, { Vimeo: undefined }));
  });
});

describe('createVideoPlayer — YouTube', () => {
  it('maps onStateChange 1/2/0 to play/pause/ended, once each', async () => {
    const { player, mock } = ytPlayer();
    const seen = record(player, ['play', 'pause', 'ended']);
    await player.ready();
    mock()._fire('play');
    mock()._stateTo(3); // buffering: not a new play
    mock()._fire('play');
    mock()._fire('pause');
    mock()._fire('play');
    mock()._fire('ended');
    assert.deepStrictEqual(seen.map((e) => e[0]), ['play', 'pause', 'play', 'ended']);
  });

  it('resolves getCurrentTime to the player value', async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    mock()._setTime(12.5);
    assert.strictEqual(await player.getCurrentTime(), 12.5);
    assert.strictEqual(await player.getDuration(), 3600);
    assert.strictEqual(player.provider, 'yt');
  });

  it('getters wait for ready', async () => {
    const { player, mock } = ytPlayer();
    const t = player.getCurrentTime();
    await player.ready();
    assert.strictEqual(await t, 0);
    assert.ok(mock(), 'the YT.Player was built');
  });

  it('play, pause and getPaused drive the player', async () => {
    const { player, mock } = ytPlayer();
    await player.play();
    assert.strictEqual(mock().getPlayerState(), 1);
    assert.strictEqual(await player.getPaused(), false);
    await player.pause();
    assert.strictEqual(await player.getPaused(), true);
  });

  it('the poll emits timeupdate when the position moves', async () => {
    const { player, mock, timers } = ytPlayer();
    const seen = record(player, ['timeupdate']);
    await player.ready();
    timers.tick();
    mock()._setTime(0.25);
    timers.tick();
    timers.tick();
    assert.deepStrictEqual(seen.map((e) => e[1].seconds), [0, 0.25]);
  });

  it('a jump of more than a second emits seeked; steady playback does not', async () => {
    const { player, mock, timers } = ytPlayer();
    const seen = record(player, ['seeked']);
    await player.ready();
    mock()._fire('play');
    timers.tick();
    for (let i = 1; i <= 8; i++) { mock()._setTime(i * 0.25); timers.tick(); }
    assert.deepStrictEqual(seen, []);
    mock()._setTime(100);
    timers.tick();
    assert.deepStrictEqual(seen.map((e) => e[1].seconds), [100]);
  });

  it('setCurrentTime seeks and emits seeked once, not again from the poll', async () => {
    const { player, mock, timers } = ytPlayer();
    const seen = record(player, ['seeked']);
    await player.ready();
    timers.tick();
    await player.setCurrentTime(50);
    timers.tick();
    assert.strictEqual(mock().getCurrentTime(), 50);
    assert.deepStrictEqual(seen.map((e) => e[1].seconds), [50]);
  });

  it('the poll emits durationchange when the length changes', async () => {
    const { player, mock, timers } = ytPlayer();
    const seen = record(player, ['durationchange']);
    await player.ready();
    timers.tick();
    timers.tick();
    mock()._setMediaDuration(370.2654);
    timers.tick();
    assert.deepStrictEqual(seen.map((e) => e[1].duration), [3600, 370.2654]);
  });

  it('maps onPlaybackRateChange to playbackratechange', async () => {
    const { player, mock } = ytPlayer();
    const seen = record(player, ['playbackratechange']);
    await player.ready();
    mock().setPlaybackRate(1.5);
    assert.deepStrictEqual(seen, [['playbackratechange', { playbackRate: 1.5 }]]);
  });

  it('unloads YouTube captions once playing (cc_load_policy=0 alone does not keep them off)', async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    mock()._fire('play');
    assert.ok(mock()._unloaded.includes('captions'));
  });

  it('rejects ready when the player reports an error first', async () => {
    const win = loadMock('mock_youtube_player.js');
    win.__mockReadyReject = true;
    const player = createVideoPlayer({}, YT_SOURCE, Object.assign({ YT: win.YT }, fakeTimers().env));
    await assert.rejects(player.ready());
  });

  it('destroy stops the poll and destroys the player', async () => {
    const { player, mock, timers } = ytPlayer();
    const seen = record(player, ['timeupdate']);
    await player.ready();
    player.destroy();
    mock()._setTime(5);
    timers.tick();
    assert.deepStrictEqual(seen, []);
    assert.strictEqual(mock()._destroyed, true);
  });

  it('stops polling once its iframe has left the page (the preview replaces it on a video switch)', async () => {
    const { player, mock, timers } = ytPlayer();
    const seen = record(player, ['timeupdate']);
    await player.ready();
    const frame = { isConnected: true };
    mock().getIframe = () => frame;
    timers.tick();
    frame.isConnected = false;
    mock()._setTime(9);
    timers.tick();
    assert.deepStrictEqual(seen.map((e) => e[1].seconds), [0]);
    assert.strictEqual(timers.fns.filter(Boolean).length, 0);
  });

  it('rejects ready when the player never answers, so the caller can fail open', async () => {
    const win = loadMock('mock_youtube_player.js');
    win.__mockReadyHeld = true;
    const timers = fakeTimers();
    const player = createVideoPlayer({}, YT_SOURCE, Object.assign({ YT: win.YT }, timers.env));
    await Promise.resolve();
    timers.advance(YT_READY_TIMEOUT_MS - 1);
    let settled = false;
    player.ready().then(() => { settled = true; }, () => { settled = true; });
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(settled, false);
    timers.advance(1);
    await assert.rejects(player.ready(), /did not become ready/);
  });

  it('a player that becomes ready leaves no timeout armed', async () => {
    const { player, timers } = ytPlayer();
    await player.ready();
    assert.strictEqual(timers.timeouts.filter(Boolean).length, 0);
  });

  it('builds no YT.Player when destroyed before the API arrives', async () => {
    const win = loadMock('mock_youtube_player.js');
    let release;
    const api = new Promise((r) => { release = r; });
    const timers = fakeTimers();
    const player = createVideoPlayer({}, YT_SOURCE, Object.assign({ loadYouTubeApi: () => api }, timers.env));
    player.destroy();
    release(win.YT);
    await assert.rejects(player.ready());
    assert.strictEqual((win.__mockPlayers || []).length, 0);
  });

  it('reads the aspect from oEmbed', async () => {
    let asked = '';
    const { player } = ytPlayer({
      fetch: (url) => { asked = url; return Promise.resolve({ ok: true, json: () => Promise.resolve({ width: 1440, height: 1080 }) }); },
    });
    assert.strictEqual(await player.getAspect(), '1440 / 1080');
    assert.ok(asked.startsWith('https://www.youtube.com/oembed?'), asked);
    assert.ok(asked.includes('url=' + encodeURIComponent(YT_SOURCE.watchUrl)), asked);
    assert.ok(asked.includes('format=json'), asked);
  });

  it('falls back to 16 / 9 when oEmbed fails', async () => {
    const { player } = ytPlayer();
    assert.strictEqual(await player.getAspect(), '16 / 9');
  });
});

// Measured in the real embed, 2026-11-23: seekTo from any state but playing
// or paused STARTS playback (cued -> buffering -> playing, ~0.6 s later), and
// so does a seek from ended. Vimeo's setCurrentTime never does. The mock
// models that transition; the adapter must keep a stopped player stopped.
const settle = () => new Promise((r) => setTimeout(r, 5));

describe('mock YouTube player — a seek starts playback, as the real one does', () => {
  it('from unstarted', async () => {
    const win = loadMock('mock_youtube_player.js');
    const states = [];
    const p = new win.YT.Player({ getAttribute: () => null }, { events: { onStateChange: (e) => states.push(e.data) } });
    p.seekTo(60, true);
    await settle();
    assert.deepStrictEqual(states, [3, 1]);
    assert.strictEqual(p.getCurrentTime(), 60);
  });

  it('from ended, but not while paused or playing', async () => {
    const win = loadMock('mock_youtube_player.js');
    const states = [];
    const p = new win.YT.Player({ getAttribute: () => null }, { events: { onStateChange: (e) => states.push(e.data) } });
    p._fire('play'); p._fire('pause');
    states.length = 0;
    p.seekTo(10, true);
    await settle();
    assert.deepStrictEqual(states, [], 'paused stays paused');
    p._fire('play');
    states.length = 0;
    p.seekTo(20, true);
    await settle();
    assert.deepStrictEqual(states, [], 'playing keeps playing');
    p._fire('ended');
    states.length = 0;
    p.seekTo(30, true);
    await settle();
    assert.deepStrictEqual(states, [3, 1]);
  });
});

describe('createVideoPlayer — YouTube: a seek does not start playback', () => {
  it('a seek before any play leaves the player stopped at the new position', async () => {
    const { player, mock } = ytPlayer();
    const seen = record(player, ['play', 'pause', 'seeked']);
    await player.ready();
    await player.setCurrentTime(60);
    await settle();
    assert.strictEqual(await player.getPaused(), true);
    assert.strictEqual(mock().getPlayerState(), 2, 'paused, not left playing');
    assert.strictEqual(await player.getCurrentTime(), 60);
    assert.deepStrictEqual(seen.map((e) => e[0]), ['seeked'], 'the viewer never saw it play');
  });

  it("the start it stops still has YouTube's captions unloaded (they would sit under ours, paused)", async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    await player.setCurrentTime(60);
    await settle();
    assert.deepStrictEqual(Array.from(mock()._unloaded), ['captions']);
  });

  it('a seek after the end leaves the player stopped', async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    mock()._fire('play');
    mock()._fire('ended');
    const seen = record(player, ['play']);
    await player.setCurrentTime(30);
    await settle();
    assert.strictEqual(await player.getPaused(), true);
    assert.deepStrictEqual(seen, []);
  });

  it('a seek while playing keeps playing', async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    mock()._fire('play');
    const seen = record(player, ['play', 'pause']);
    await player.setCurrentTime(120);
    await settle();
    assert.strictEqual(await player.getPaused(), false);
    assert.deepStrictEqual(seen, []);
  });

  it('a seek while buffering inside playback keeps playing', async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    mock()._fire('play');
    mock()._stateTo(3);
    const seen = record(player, ['play', 'pause']);
    await player.setCurrentTime(120);
    mock()._stateTo(1);
    await settle();
    assert.strictEqual(mock().getPlayerState(), 1);
    assert.deepStrictEqual(seen, []);
  });

  it('a seek while paused stays paused, and the next play still plays', async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    mock()._fire('play');
    mock()._fire('pause');
    await player.setCurrentTime(200);
    await settle();
    assert.strictEqual(await player.getPaused(), true);
    const seen = record(player, ['play']);
    mock().playVideo(); // YouTube's own play button
    assert.strictEqual(await player.getPaused(), false);
    assert.strictEqual(seen.length, 1);
  });

  it('play() right behind a seek plays', async () => {
    const { player } = ytPlayer();
    const seen = record(player, ['play']);
    await player.ready();
    await player.setCurrentTime(60);
    await player.play();
    await settle();
    assert.strictEqual(await player.getPaused(), false);
    assert.strictEqual(seen.length, 1);
  });

  it("after the stop, YouTube's own play button plays", async () => {
    const { player, mock } = ytPlayer();
    await player.ready();
    await player.setCurrentTime(60);
    await settle();
    const seen = record(player, ['play']);
    mock().playVideo();
    assert.strictEqual(await player.getPaused(), false);
    assert.strictEqual(seen.length, 1);
  });

  it('the hold lapses: where the browser blocks the start, a later play is the viewer\'s', async () => {
    const { player, mock, timers } = ytPlayer();
    await player.ready();
    mock().__seekNeverStarts = true; // autoplay blocked: the seek starts nothing
    await player.setCurrentTime(60);
    await settle();
    assert.strictEqual(mock().getPlayerState(), -1);
    timers.advance(YT_SEEK_HOLD_MS + 1);
    const seen = record(player, ['play']);
    mock().playVideo();
    assert.strictEqual(await player.getPaused(), false);
    assert.strictEqual(seen.length, 1);
  });

  it('the hold lasts through a slow buffer', async () => {
    const { player, mock, timers } = ytPlayer();
    await player.ready();
    mock().__seekNeverStarts = true; // this test walks the states itself
    await player.setCurrentTime(60);
    timers.advance(YT_SEEK_HOLD_MS - 100);
    mock()._stateTo(3);
    timers.advance(YT_SEEK_HOLD_MS - 100);
    const seen = record(player, ['play']);
    mock()._stateTo(1);
    assert.strictEqual(mock().getPlayerState(), 2);
    assert.deepStrictEqual(seen, []);
  });
});

describe('createVideoPlayer — unplayable', () => {
  it('throws for a Drive mirror', () => {
    assert.throws(() => createVideoPlayer({}, GD_SOURCE, {}));
  });
});

// The poster over a YouTube player (site/js/video_player.js attachPoster):
// the video's still with a small play button at its bottom-left corner, in
// place of YouTube's own title bar and centred button.
describe('video poster', () => {
  const { attachPoster, posterImageUrl, POSTER_FALLBACK_MS } = require('../site/js/video_player.js');

  function fakeDocument() {
    function el(tag) {
      return {
        tagName: tag.toUpperCase(), children: [], parentNode: null, attrs: {}, listeners: {},
        className: '', src: '', alt: null, type: '', innerHTML: '',
        setAttribute(k, v) { this.attrs[k] = String(v); },
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
        removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; },
        addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
        dispatch(ev) { (this.listeners[ev] || []).forEach((fn) => fn({ preventDefault() {}, stopPropagation() {} })); },
        querySelectorAll(sel) {
          const cls = sel.replace(/^\./, '');
          const out = [];
          (function walk(n) { n.children.forEach((c) => { if ((' ' + c.className + ' ').includes(' ' + cls + ' ')) out.push(c); walk(c); }); })(this);
          return out;
        },
      };
    }
    return { createElement: el };
  }

  function fakePlayer() {
    const handlers = {};
    let settleAspect;
    return {
      aspect: new Promise((resolve, reject) => { settleAspect = { resolve, reject }; }),
      settleAspect: (ok) => (ok ? settleAspect.resolve('4 / 3') : settleAspect.reject(new Error('no shape'))),
      getAspect() { return this.aspect; },
      plays: 0,
      playResult: Promise.resolve(),
      on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
      emit(ev, d) { (handlers[ev] || []).forEach((fn) => fn(d)); },
      play() { this.plays += 1; return this.playResult; },
    };
  }

  function setup(source) {
    const doc = fakeDocument();
    const container = doc.createElement('div');
    const timers = [];
    const env = {
      document: doc,
      label: 'Play video',
      setTimeout: (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length; },
      clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].live = false; },
    };
    const player = fakePlayer();
    const poster = attachPoster(container, player, source || YT_SOURCE, env);
    return { container, player, poster, timers };
  }

  it('posterImageUrl names the still YouTube serves for the video', () => {
    assert.strictEqual(posterImageUrl(YT_SOURCE), 'https://i.ytimg.com/vi/AbCdEfGhIjK/hqdefault.jpg');
  });

  it('posterImageUrl has nothing for a Vimeo, Drive or malformed source', () => {
    assert.strictEqual(posterImageUrl(VIMEO_SOURCE), '');
    assert.strictEqual(posterImageUrl(GD_SOURCE), '');
    assert.strictEqual(posterImageUrl({ provider: 'yt', id: 'short' }), '');
    assert.strictEqual(posterImageUrl(null), '');
  });

  it('puts no poster over a Vimeo player', () => {
    const { container, poster } = setup(VIMEO_SOURCE);
    assert.strictEqual(poster, null);
    assert.strictEqual(container.children.length, 0);
  });

  it('covers a YouTube player with a labelled button holding the still and the play mark', () => {
    const { container, poster } = setup();
    assert.ok(poster);
    assert.deepStrictEqual(container.children, [poster.el]);
    assert.strictEqual(poster.el.tagName, 'BUTTON');
    assert.strictEqual(poster.el.type, 'button');
    assert.strictEqual(poster.el.className, 'video-poster');
    assert.strictEqual(poster.el.getAttribute('aria-label'), 'Play video');
    const img = poster.el.children.find((c) => c.tagName === 'IMG');
    assert.strictEqual(img.src, 'https://i.ytimg.com/vi/AbCdEfGhIjK/hqdefault.jpg');
    assert.strictEqual(img.alt, '');
    assert.strictEqual(poster.el.querySelectorAll('.video-poster__play').length, 1);
  });

  it('a click plays the video, and the first play takes the poster away', async () => {
    const { container, player, poster } = setup();
    poster.el.dispatch('click');
    assert.strictEqual(player.plays, 1);
    assert.strictEqual(container.children.length, 1, 'stays until playback really starts');
    player.emit('play', { seconds: 0 });
    assert.strictEqual(container.children.length, 0);
  });

  it('a second click while starting does not ask to play again', () => {
    const { player, poster } = setup();
    poster.el.dispatch('click');
    poster.el.dispatch('click');
    assert.strictEqual(player.plays, 1);
  });

  it('playback started elsewhere (keyboard, sync) takes the poster away too', () => {
    const { container, player } = setup();
    player.emit('play', { seconds: 12 });
    assert.strictEqual(container.children.length, 0);
  });

  it('when the browser does not let the page start it, the poster steps aside for the player\'s own button', () => {
    const { container, player, poster, timers } = setup();
    poster.el.dispatch('click');
    const t = timers.find((x) => x.live);
    assert.strictEqual(t.ms, POSTER_FALLBACK_MS);
    t.fn();
    assert.strictEqual(container.children.length, 0);
    player.emit('play', { seconds: 0 }); // late play: nothing left to remove, no throw
  });

  it('a refused play takes the poster away at once', async () => {
    const { container, player, poster } = setup();
    player.playResult = Promise.reject(new Error('not allowed'));
    poster.el.dispatch('click');
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(container.children.length, 0);
  });

  it('remove is idempotent and cancels the fallback', () => {
    const { container, poster, timers } = setup();
    poster.el.dispatch('click');
    poster.remove();
    poster.remove();
    assert.strictEqual(container.children.length, 0);
    assert.ok(timers.every((x) => !x.live));
  });
});

describe('video poster waits for the video\'s shape', () => {
  const { attachPoster } = require('../site/js/video_player.js');
  // The box is 16:9 until the player reports the video's shape; the still and
  // its button show only once it has, so the button does not jump with the box.
  function mk() {
    const el = (tag) => ({
      tagName: tag.toUpperCase(), children: [], attrs: {}, className: '',
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      hasAttribute(k) { return k in this.attrs; },
      appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
      removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
      addEventListener() {},
    });
    let settle;
    const player = {
      on() {}, play() { return Promise.resolve(); },
      aspectCalls: 0,
      getAspect() { this.aspectCalls += 1; return new Promise((res, rej) => { settle = { res, rej }; }); },
    };
    const poster = attachPoster(el('div'), player, YT_SOURCE, { document: { createElement: el } });
    return { poster, player, settle: () => settle };
  }

  it('is not shaped until the player reports the shape, then is', async () => {
    const { poster, settle } = mk();
    assert.strictEqual(poster.el.getAttribute('data-shaped'), null);
    settle().res('4 / 3');
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(poster.el.getAttribute('data-shaped'), '');
  });

  it('shows anyway when the shape cannot be had', async () => {
    const { poster, settle } = mk();
    settle().rej(new Error('offline'));
    await new Promise((r) => setImmediate(r));
    assert.strictEqual(poster.el.getAttribute('data-shaped'), '');
  });
});

describe('YouTube getAspect asks once per player', () => {
  it('a second call reuses the first answer', async () => {
    let fetches = 0;
    const fetch = () => { fetches += 1; return Promise.resolve({ ok: true, json: () => ({ width: 640, height: 480 }) }); };
    const p = createVideoPlayer({}, YT_SOURCE, { fetch, loadYouTubeApi: () => new Promise(() => {}) });
    assert.strictEqual(await p.getAspect(), '640 / 480');
    assert.strictEqual(await p.getAspect(), '640 / 480');
    assert.strictEqual(fetches, 1);
  });
});
