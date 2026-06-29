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
  isNavigation,
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

describe('pickStrategy — the routing the fetch handler applies', () => {
  it('navigation, API and raw are network-first', () => {
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/'), 'network-first');
    assert.strictEqual(pickStrategy('https://sy-tools.github.io/sy-subtitles/index.html'), 'network-first');
    assert.strictEqual(pickStrategy('https://api.github.com/git/trees/main?recursive=1'), 'network-first');
    assert.strictEqual(pickStrategy('https://raw.githubusercontent.com/o/r/main/review-status.json'), 'network-first');
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
