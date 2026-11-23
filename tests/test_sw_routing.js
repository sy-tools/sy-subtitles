// Unit coverage for the service-worker routing decision (site/js/sw_routing.js).
//
// The predicates that decide which caching strategy a request gets used to live
// inline in sw.js, where only the slow, flaky Playwright E2E could reach them —
// yet that decision is exactly where the real bugs hide (the host-vs-substring
// guard in isApiOrRaw, the navigation URL forms). Extracting them into a single-
// source module lets the fast Node suite pin every branch deterministically;
// sw.js loads the SAME file via importScripts.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isImmutable,
  isApiOrRaw,
  isApiHost,
  isNavigation,
  hasImmutableVersion,
  pickStrategy,
  cacheKeyFor,
} = require('../site/js/sw_routing');

const C1 = 'a'.repeat(40);
const C2 = '0123456789abcdef0123456789abcdef01234567';
const pinned = (c, path, v) => 'https://raw.githubusercontent.com/o/r/' + c + '/' + path + (v ? '?v=' + v : '');

describe('isImmutable — versioned/static assets safe to cache-first', () => {
  it('matches every immutable pattern', () => {
    assert.strictEqual(isImmutable('https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js'), true);
    assert.strictEqual(isImmutable('https://player.vimeo.com/api/player.js'), true);
    assert.strictEqual(isImmutable('https://sy-tools.github.io/sy-subtitles/icon.png'), true);
  });
  it('does NOT match Vimeo player iframe/video URLs (only /api is immutable)', () => {
    assert.strictEqual(isImmutable('https://player.vimeo.com/video/123456'), false);
  });
  it('does NOT match the app shell or app assets', () => {
    assert.strictEqual(isImmutable('https://sy-tools.github.io/sy-subtitles/js/app.js'), false);
    assert.strictEqual(isImmutable('https://sy-tools.github.io/sy-subtitles/index.html'), false);
  });
});

describe('isApiOrRaw — exact host match, never a substring', () => {
  it('matches the GitHub API and raw hosts', () => {
    assert.strictEqual(isApiOrRaw('https://api.github.com/git/trees/main?recursive=1'), true);
    assert.strictEqual(isApiOrRaw('https://raw.githubusercontent.com/sy-tools/sy-subtitles/main/review-status.json'), true);
  });
  it('does NOT match github.com or other github subdomains', () => {
    assert.strictEqual(isApiOrRaw('https://github.com/sy-tools/sy-subtitles'), false);
    assert.strictEqual(isApiOrRaw('https://sub.api.github.com/x'), false);
  });
  it('SECURITY: a foreign host with the API host in its path/query is NOT matched', () => {
    assert.strictEqual(isApiOrRaw('https://evil.com/?x=api.github.com'), false);
    assert.strictEqual(isApiOrRaw('https://api.github.com.evil.com/git/trees'), false);
  });
  it('returns false for a malformed or empty URL without throwing', () => {
    assert.strictEqual(isApiOrRaw('not a url'), false);
    assert.strictEqual(isApiOrRaw(''), false);
  });
});

describe('isNavigation — the app shell / HTML document', () => {
  it('matches the directory root, index.html, and a hash deep-link', () => {
    assert.strictEqual(isNavigation('https://sy-tools.github.io/sy-subtitles/'), true);
    assert.strictEqual(isNavigation('https://sy-tools.github.io/sy-subtitles/index.html'), true);
    assert.strictEqual(isNavigation('https://sy-tools.github.io/sy-subtitles/#/preview/1979-09-27_foo'), true);
  });
  it('does NOT match a plain asset path', () => {
    assert.strictEqual(isNavigation('https://sy-tools.github.io/sy-subtitles/js/app.js'), false);
  });
  it('documents the current quirk: a root with a query string is not detected', () => {
    // endsWith('/') is false once a ?query is appended; it still routes to
    // network-first via the fallthrough, so behaviour is unaffected — pinned so
    // a future change to isNavigation is a deliberate one.
    assert.strictEqual(isNavigation('https://sy-tools.github.io/sy-subtitles/?branch=main'), false);
  });
});

describe('hasImmutableVersion — sha-pinned (?v=) content is immutable by URL', () => {
  it('detects a non-empty v query param', () => {
    assert.strictEqual(hasImmutableVersion('https://raw.githubusercontent.com/o/r/main/talks/x/uk/final/uk.srt?v=ab12cd34'), true);
    assert.strictEqual(hasImmutableVersion('https://raw.githubusercontent.com/o/r/main/talks/x/transcript_uk.txt?v=deadbee'), true);
    assert.strictEqual(hasImmutableVersion('https://raw.githubusercontent.com/o/r/main/review-status.json?v=cafe123'), true);
  });
  it('detects the full blob sha the app tags a commit-pinned meta.yaml with', () => {
    assert.strictEqual(hasImmutableVersion(pinned(C1, 'talks/x/meta.yaml', 'b'.repeat(40))), true);
  });
  it('is false when there is no v param (a branch-read meta.yaml, the Trees API, the shell)', () => {
    // meta.yaml carries no ?v= only when the manifest commit is unknown and the
    // branch is read (js/manifest_fetch.js rawFileUrl), or its blob sha is.
    assert.strictEqual(hasImmutableVersion('https://raw.githubusercontent.com/o/r/main/talks/x/meta.yaml'), false);
    assert.strictEqual(hasImmutableVersion(pinned(C1, 'talks/x/meta.yaml')), false);
    // the Trees API uses ?recursive=1, never ?v= — must stay network-first
    assert.strictEqual(hasImmutableVersion('https://api.github.com/git/trees/main?recursive=1'), false);
    assert.strictEqual(hasImmutableVersion('https://sy-tools.github.io/sy-subtitles/index.html'), false);
  });
  it('is false for an empty v param and tolerates a malformed URL', () => {
    assert.strictEqual(hasImmutableVersion('https://raw.githubusercontent.com/o/r/main/x.srt?v='), false);
    assert.strictEqual(hasImmutableVersion('not a url'), false);
  });
});

describe('isApiHost — the GitHub Trees API, routed network-only', () => {
  it('matches api.github.com only (not raw, not other hosts)', () => {
    assert.strictEqual(isApiHost('https://api.github.com/git/trees/main?recursive=1'), true);
    assert.strictEqual(isApiHost('https://raw.githubusercontent.com/o/r/main/x.srt'), false);
    assert.strictEqual(isApiHost('https://github.com/o/r'), false);
    assert.strictEqual(isApiHost('https://api.github.com.evil.com/x'), false);
    assert.strictEqual(isApiHost('not a url'), false);
  });
});

describe('pickStrategy — the routing the fetch handler applies', () => {
  it('the Trees API is network-only (never cached, so offline is detectable)', () => {
    assert.strictEqual(pickStrategy('https://api.github.com/git/trees/main?recursive=1'), 'network-only');
  });
  it('navigation and unversioned raw are network-first', () => {
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/'), 'network-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/index.html'), 'network-first');
    // The branch form: what meta.yaml is read from when the manifest commit is
    // unknown. Its CDN copy may lag a push, so it must keep revalidating.
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/talks/x/meta.yaml'), 'network-first');
    // Pinned to a commit but with no blob sha to name the bytes: no ?v=.
    assert.strictEqual(pickStrategy(pinned(C1, 'talks/x/meta.yaml')), 'network-first');
  });
  it('meta.yaml as the app reads it — commit-pinned, ?v=<full blob sha> — is cache-first', () => {
    const blob = 'b'.repeat(40);
    assert.strictEqual(pickStrategy(pinned(C1, 'talks/x/meta.yaml', blob)), 'cache-first');
    // ...and cached once per content, not once per commit.
    assert.strictEqual(cacheKeyFor(pinned(C1, 'talks/x/meta.yaml', blob)), cacheKeyFor(pinned(C2, 'talks/x/meta.yaml', blob)));
  });
  it('commit-pinned (?v=) raw content is cache-first — instant offline, no redundant refetch', () => {
    assert.strictEqual(pickStrategy(pinned(C1, 'talks/x/uk/final/uk.srt', 'ab12cd34')), 'cache-first');
    assert.strictEqual(pickStrategy(pinned(C1, 'talks/x/transcript_uk.txt', 'deadbee')), 'cache-first');
    assert.strictEqual(pickStrategy(pinned(C1, 'review-status.json', 'cafe123')), 'cache-first');
  });
  it('a ?v= on a BRANCH raw URL is not trusted: the CDN ignores the query', () => {
    // raw.githubusercontent keys its cache on the path alone, so right after a
    // push main/x.srt?v=<new blob> still returns the OLD bytes (measured).
    // Cached as immutable, that old copy would be served for good.
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/talks/x/uk/final/uk.srt?v=ab12cd34'), 'network-first');
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/review-status.json?v=cafe123'), 'network-first');
    // a 40-hex segment that is not the ref position does not count
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/' + C1 + '/x.srt?v=ab'), 'network-first');
  });
  it('immutable assets are cache-first', () => {
    assert.strictEqual(pickStrategy('https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js'), 'cache-first');
    assert.strictEqual(pickStrategy('https://player.vimeo.com/api/player.js'), 'cache-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/icon.png'), 'cache-first');
  });
  it('the vendored dictionary is cache-first, its wordlist is not', () => {
    // 9 MB of hunspell that changes only when it is re-vendored: fetching it
    // over the network on every session, for a feature the user has already
    // turned on, is the one cost that would make the hints not worth having.
    // words_uk.txt is the opposite — it grows with every talk added, so it must
    // keep revalidating or a translator is underlined for accepted vocabulary.
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/dict/uk_UA.dic'), 'cache-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/dict/uk_UA.aff'), 'cache-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/dict/words_uk.txt'), 'network-first');
  });
  it('everything else (app js/css, vimeo iframe) is network-first', () => {
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/js/app.js'), 'network-first');
    assert.strictEqual(pickStrategy('https://player.vimeo.com/video/123456'), 'network-first');
  });
  it('navigation precedence holds even for an icon under a hash route', () => {
    // isNavigation wins before isImmutable: a hash deep-link is the shell, not an
    // asset, so it must stay network-first.
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/#/icon.png'), 'network-first');
  });
});

const B1 = 'b'.repeat(40);
const B2 = 'b'.repeat(8) + 'c'.repeat(32);

describe('cacheKeyFor — commit-pinned content is cached by blob, not by commit', () => {
  it('maps the same full blob sha under any commit to one key', () => {
    // Every commit (a bot status update included) changes the URL of every
    // file; keyed by commit, each would be downloaded again though unchanged.
    assert.strictEqual(
      cacheKeyFor(pinned(C1, 'talks/x/uk/final/uk.srt', B1)),
      cacheKeyFor(pinned(C2, 'talks/x/uk/final/uk.srt', B1)),
    );
  });
  it('keeps different blobs and different paths apart', () => {
    assert.notStrictEqual(cacheKeyFor(pinned(C1, 'a.srt', B1)), cacheKeyFor(pinned(C1, 'a.srt', B2)));
    assert.notStrictEqual(cacheKeyFor(pinned(C1, 'a.srt', B1)), cacheKeyFor(pinned(C1, 'b.srt', B1)));
  });
  it('shares a key across commits only for a full blob sha', () => {
    // A short prefix can be matched by a crafted blob (32 bits is brute-forceable)
    // in a commit raw serves for this repo (a fork's included); sharing the key
    // would let that commit's bytes answer for the real file later.
    assert.notStrictEqual(
      cacheKeyFor(pinned(C1, 'a.srt', 'ab12cd34')),
      cacheKeyFor(pinned(C2, 'a.srt', 'ab12cd34')),
    );
    assert.strictEqual(cacheKeyFor(pinned(C1, 'a.srt', 'ab12cd34')), pinned(C1, 'a.srt', 'ab12cd34'));
  });
  it('leaves every other URL as it is', () => {
    const urls = [
      'https://raw.githubusercontent.com/o/r/main/talks/x/meta.yaml',
      pinned(C1, 'talks/x/meta.yaml'),
      'https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js',
      'not a url',
    ];
    urls.forEach((u) => assert.strictEqual(cacheKeyFor(u), u));
  });
});

describe('bypassesWorker — media is left to the browser', () => {
  const { bypassesWorker } = require('../site/js/sw_routing');
  const fs = require('fs');

  it('lets video and audio elements fetch on their own', () => {
    assert.strictEqual(bypassesWorker('video', null), true);
    assert.strictEqual(bypassesWorker('audio', null), true);
  });

  it('lets any range request through, whatever asked for it', () => {
    assert.strictEqual(bypassesWorker('', 'bytes=0-'), true);
  });

  it('keeps everything else on the worker', () => {
    assert.strictEqual(bypassesWorker('document', null), false);
    assert.strictEqual(bypassesWorker('script', null), false);
    assert.strictEqual(bypassesWorker('', null), false);
  });

  it('is consulted before the worker answers a request', () => {
    const sw = fs.readFileSync(require('path').join(__dirname, '..', 'site', 'sw.js'), 'utf8');
    const handler = sw.slice(sw.indexOf("addEventListener('fetch'"));
    const check = handler.indexOf("bypassesWorker(e.request.destination, e.request.headers.get('Range'))");
    assert.ok(check !== -1, 'the fetch handler never asks bypassesWorker');
    assert.ok(check < handler.indexOf('e.respondWith('), 'bypassesWorker is asked after the worker has answered');
  });
});

describe('YouTube player hosts — network-only', () => {
  // The IFrame API is a loader that pulls a versioned player script it names
  // itself; a cached copy would pin an old one, and a stale API breaks
  // playback outright. Offline there is no video to play anyway.
  it('the IFrame API, its player scripts and oEmbed are network-only', () => {
    [
      'https://www.youtube.com/iframe_api',
      'https://www.youtube.com/s/player/abc123/www-widgetapi.vflset/www-widgetapi.js',
      'https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DAbCdEfGhIjK',
      'https://www.youtube.com/embed/AbCdEfGhIjK?enablejsapi=1',
      'https://youtube.com/iframe_api',
      'https://s.ytimg.com/yts/jsbin/www-widgetapi.js',
    ].forEach((u) => assert.strictEqual(pickStrategy(u), 'network-only', u));
  });
  it('matches the host, not a substring', () => {
    assert.strictEqual(pickStrategy('https://evil.com/?x=www.youtube.com'), 'network-first');
    assert.strictEqual(pickStrategy('https://www.youtube.com.evil.com/iframe_api'), 'network-first');
  });
});
