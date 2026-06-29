// Unit coverage for the offline content-load classifier (site/js/offline_fallback.js).
// Decides when a failed SRT/transcript fetch should show the friendly
// "available online only" screen vs the existing inline error — single source,
// loaded by site/index.html and required here.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { isOfflineError } = require('../site/js/offline_fallback');

describe('isOfflineError', () => {
  it('is true whenever the browser reports offline, regardless of the error', () => {
    assert.strictEqual(isOfflineError(new Error('HTTP 404'), false), true);
    assert.strictEqual(isOfflineError(null, false), true);
  });

  it('is true online when the fetch itself rejected (a network TypeError)', () => {
    // fetch() rejects with a TypeError on a dropped connection / DNS / CORS;
    // cache-first miss while offline surfaces exactly this.
    const e = new TypeError('Failed to fetch');
    assert.strictEqual(isOfflineError(e, true), true);
  });

  it('is false online for a real HTTP error (404 / rate-limit), not offline', () => {
    // The preview loader throws `new Error('SRT fetch failed: HTTP 404')`.
    assert.strictEqual(isOfflineError(new Error('SRT fetch failed: HTTP 404'), true), false);
    // An error object carrying a status is an HTTP failure, never offline.
    const httpErr = new TypeError('weird');
    httpErr.status = 403;
    assert.strictEqual(isOfflineError(httpErr, true), false);
  });

  it('is false online with no error and tolerates a missing/odd error', () => {
    assert.strictEqual(isOfflineError(null, true), false);
    assert.strictEqual(isOfflineError(undefined, true), false);
    assert.strictEqual(isOfflineError('a string', true), false);
  });

  it('treats an undefined online flag as online (only a network error counts)', () => {
    // navigator.onLine is normally boolean; if a caller passes undefined we must
    // not falsely declare offline on a plain HTTP error.
    assert.strictEqual(isOfflineError(new Error('HTTP 500'), undefined), false);
    assert.strictEqual(isOfflineError(new TypeError('Failed to fetch'), undefined), true);
  });
});
