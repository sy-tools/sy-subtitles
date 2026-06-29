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
} = require('../site/js/sw_routing');

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
  it('is false when there is no v param (meta.yaml, the Trees API, the shell)', () => {
    assert.strictEqual(hasImmutableVersion('https://raw.githubusercontent.com/o/r/main/talks/x/meta.yaml'), false);
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
  it('navigation and raw (meta.yaml) are network-first', () => {
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/'), 'network-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/index.html'), 'network-first');
    // raw WITHOUT ?v= (meta.yaml) stays network-first
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/talks/x/meta.yaml'), 'network-first');
  });
  it('sha-pinned (?v=) raw content is cache-first — instant offline, no redundant refetch', () => {
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/talks/x/uk/final/uk.srt?v=ab12cd34'), 'cache-first');
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/talks/x/transcript_uk.txt?v=deadbee'), 'cache-first');
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/review-status.json?v=cafe123'), 'cache-first');
  });
  it('immutable assets are cache-first', () => {
    assert.strictEqual(pickStrategy('https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js'), 'cache-first');
    assert.strictEqual(pickStrategy('https://player.vimeo.com/api/player.js'), 'cache-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/icon.png'), 'cache-first');
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
