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
