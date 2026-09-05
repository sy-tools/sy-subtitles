// The dictionary lives here, off the main thread.
//
// Parsing the Ukrainian hunspell dictionary costs ~4 seconds and ~290 MB — on
// the main thread that is four seconds of frozen editor. Here it costs the user
// nothing but a wait before the first hints appear, and the page stays live
// throughout. Lookups afterwards are sub-microsecond, so a whole subtitle block
// is judged faster than the next keystroke arrives.
//
// The main thread starts this worker only when the hints preference is on, and
// terminates it when the preference goes off — that is what gives the memory
// back.
//
// Protocol:
//   in   { seq, texts }       every visible field, in order
//   out  { ready: true }      the dictionary is loaded; hints start now
//   out  { seq, spans }       per field, the spans of words neither source knows
//   out  { failed: reason }   the dictionary could not be loaded
//
// A whole talk is judged at once rather than a cell at a time: a lookup is
// sub-microsecond, so the batch costs milliseconds, and it spares the main
// thread from tracking which cell changed across re-renders.
//
// `seq` is echoed back so the main thread can drop a reply that arrives after
// the user has typed on — its offsets would no longer describe the screen.

importScripts('vendor/typo.js', 'typo_hints.js');

var dictionary = null;
// Words the general dictionary does not know but this project uses anyway —
// the Sahaja Yoga vocabulary and its transliterations. Built by
// tools/build_wordlist.py from the talks and the glossary.
var ownWords = null;

// Two sources, two conventions. The project's own list is keyed the way the
// project writes — typographic apostrophe — and the dictionary is keyed the way
// hunspell ships, so each is asked in its own spelling.
function isKnown(word) {
  return ownWords.has(word) || dictionary.check(dictionaryForm(word));
}

self.onmessage = function (e) {
  var msg = e.data || {};
  if (!dictionary) return;
  self.postMessage({
    seq: msg.seq,
    spans: (msg.texts || []).map(function (text) { return findUnknownWords(text, isKnown); }),
  });
};

Promise.all([
  // The dictionary never changes, so let the HTTP cache hold it: re-parsing is
  // the expensive part, re-downloading 9 MB on every session would be worse.
  fetch('../dict/uk_UA.aff').then(function (r) { return r.text(); }),
  fetch('../dict/uk_UA.dic').then(function (r) { return r.text(); }),
  // The wordlist grows with every talk added, and it is small — always
  // revalidate so a translator is not underlined for vocabulary the project
  // has already accepted.
  fetch('../dict/words_uk.txt', { cache: 'no-cache' }).then(function (r) { return r.text(); }),
])
  .then(function (parts) {
    dictionary = new Typo('uk_UA', parts[0], parts[1], {});
    ownWords = new Set(parts[2].split('\n').filter(Boolean));
    self.postMessage({ ready: true });
  })
  .catch(function (err) {
    // Offline, or the assets are missing. Say so once: the main thread turns
    // the hints off rather than leaving the user waiting for underlines that
    // will never come.
    self.postMessage({ failed: String((err && err.message) || err) });
  });
