const { describe, it } = require('node:test');
const assert = require('node:assert');
const { PREFS, readPref, writePref } = require('../site/js/preferences');

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

  it('clears the key when expert mode is switched off', () => {
    // This is the path whose storage semantics changed: the old code wrote a
    // literal "0", this writes nothing at all. Both read as off — but only if
    // the key really goes.
    const storage = makeStorage({ sy_expert_mode: '1' });

    writePref(storage, 'expert', false);

    assert.equal(storage.getItem('sy_expert_mode'), null);
  });

  it('refuses a value the preference does not declare', () => {
    // readPref already rejects an unknown value, so storing one would leave the
    // app in a state it cannot read back: SPA.setTheme('sepia') would pin
    // data-theme="sepia" while the menu showed Auto as the pressed option.
    const storage = makeStorage({ sy_theme: 'dark' });

    assert.throws(() => writePref(storage, 'theme', 'sepia'), /sepia/);
    assert.equal(storage.getItem('sy_theme'), 'dark', 'storage must be left untouched');
  });
});

describe('the round trip', () => {
  it('reads back every value each preference accepts', () => {
    // The table is the contract: whatever a preference declares, storing it and
    // reading it back must give the same answer. Without this a value can be
    // written that readPref then reports as something else entirely.
    for (const [name, spec] of Object.entries(PREFS)) {
      const values = spec.bool ? [true, false] : spec.values;
      for (const value of values) {
        const storage = makeStorage();
        writePref(storage, name, value);
        assert.equal(readPref(storage, name), value, `${name} did not survive ${value}`);
      }
    }
  });
});
