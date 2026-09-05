// The user's global preferences — one declarative table, read and written
// through it. Single source: loaded by the browser via
// <script src="js/preferences.js"> in site/index.html AND required by the Node
// test suite — no inline mirror.
//
// Every preference is stored under its own localStorage key, and every key
// predates this module: the values here must keep matching what the rest of
// the app already reads, or a user's saved choice is silently lost on upgrade.
// `fallback: null` on language is deliberate: it has no default to fall back
// TO. index.html detects from navigator.language when the user has never
// chosen, so the module must report "unset" rather than invent a language.
var PREFS = {
  lang: { key: 'sy_lang', values: ['uk', 'en'], fallback: null },
  theme: { key: 'sy_theme', values: ['auto', 'dark', 'light'], fallback: 'auto' },
  expert: { key: 'sy_expert_mode', bool: true, fallback: false },
  typoHints: { key: 'sy_typo_hints', bool: true, fallback: false },
};

// The stored value, or the preference's fallback when nothing valid is stored.
// Anything the preference does not declare reads as the fallback: a hand-edited
// or stale localStorage must not put the app in a state the menu cannot render.
function readPref(storage, name) {
  var spec = PREFS[name];
  var raw = storage.getItem(spec.key);
  // Expert mode shipped as `getItem('sy_expert_mode') === '1'`, so every user
  // who turned it off has a literal "0" stored. Only "1" is on.
  if (spec.bool) return raw === '1';
  return spec.values.indexOf(raw) === -1 ? spec.fallback : raw;
}

// Store a chosen value, or clear the key when the choice IS the fallback.
// Absence is how every one of these preferences spells "no explicit choice":
// index.html only follows prefers-color-scheme while no data-theme attribute is
// set, and it sets that attribute from the stored key.
function writePref(storage, name, value) {
  var spec = PREFS[name];
  if (spec.bool) value = !!value;
  // readPref rejects anything the preference does not declare, so storing such
  // a value would leave the app in a state it cannot read back — the menu would
  // show the fallback as chosen while the page rendered what was written.
  // Refusing loudly here keeps the table the single source of truth.
  else if (value !== spec.fallback && spec.values.indexOf(value) === -1) {
    throw new Error('preferences: ' + name + ' cannot be ' + JSON.stringify(value));
  }
  if (value === spec.fallback) {
    storage.removeItem(spec.key);
    return;
  }
  // Booleans go in as the "1" index.html already compares against; String(true)
  // would leave the preference reading as off however often it is switched on.
  storage.setItem(spec.key, spec.bool ? '1' : value);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PREFS: PREFS,
    readPref: readPref,
    writePref: writePref,
  };
}
