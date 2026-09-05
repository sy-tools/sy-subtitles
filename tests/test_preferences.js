const { describe, it } = require('node:test');
const assert = require('node:assert');
const { readPref, writePref } = require('../site/js/preferences');

// In-memory storage double — the same getItem/setItem/removeItem surface the
// other SPA module tests use for localStorage.
function makeStorage(initial) {
  const store = Object.assign({}, initial || {});
  return {
    data: store,
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem(k, v) {
      store[k] = String(v);
    },
    removeItem(k) {
      delete store[k];
    },
  };
}

describe('readPref', () => {
  it('ignores a stored value the preference does not declare', () => {
    // A hand-edited or stale localStorage must not put the app in a state the
    // menu cannot render: an undeclared value reads as the default.
    const storage = makeStorage({ sy_theme: 'chartreuse' });

    assert.equal(readPref(storage, 'theme'), 'auto');
  });
});

describe('readPref — expert mode', () => {
  it('reads the "0" already in users\' storage as off', () => {
    // Expert mode shipped as localStorage.getItem('sy_expert_mode') === '1',
    // so every user who ever turned it off has a literal "0" stored. Treating
    // that as truthy would switch expert mode on for all of them.
    const storage = makeStorage({ sy_expert_mode: '0' });

    assert.equal(readPref(storage, 'expert'), false);
  });

  it('reads the "1" already in users\' storage as on', () => {
    const storage = makeStorage({ sy_expert_mode: '1' });

    assert.equal(readPref(storage, 'expert'), true);
  });
});

describe('readPref — language', () => {
  it('reports no stored choice so the caller can detect from the browser', () => {
    // Language has no fixed default: index.html falls back to navigator.language
    // when the user has never chosen. The module must say "unset" rather than
    // invent a language, or a Ukrainian browser would open in English.
    const storage = makeStorage();

    assert.equal(readPref(storage, 'lang'), null);
  });
});

describe('writePref', () => {
  it('clears the key when the theme returns to auto', () => {
    // "auto" is the absence of a choice, not a choice: index.html only follows
    // prefers-color-scheme while no data-theme attribute is set, and it sets
    // that attribute from this key. Storing the string "auto" would pin the
    // theme to whatever it was when the user picked auto.
    const storage = makeStorage({ sy_theme: 'dark' });

    writePref(storage, 'theme', 'auto');

    assert.equal(storage.getItem('sy_theme'), null);
  });

  it('writes expert mode as the "1" the rest of the app compares against', () => {
    // index.html reads this key directly as `=== '1'`; storing "true" would
    // leave expert mode off however many times the user switches it on.
    const storage = makeStorage();

    writePref(storage, 'expert', true);

    assert.equal(storage.getItem('sy_expert_mode'), '1');
  });
});
