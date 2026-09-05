// Which words in a piece of Ukrainian subtitle text look wrong.
//
// This decides WHERE the hints go, never WHETHER a word is a word: the caller
// passes an oracle, which in the app is "hunspell spells it, or the project's
// own wordlist carries it". Keeping the two apart is what lets this be tested
// without a 1.5 MB dictionary, and what lets the dictionary live in a worker.
//
// Single source: loaded by the browser via <script src="js/typo_hints.js"> in
// site/index.html, imported by js/typo_worker.js, AND required by the Node test
// suite — no inline mirror.

// Every apostrophe shape is inside the word: `п'ять` is one word, and splitting
// it would put a hint under a fragment that is not a word at all.
//
// So are combining marks (U+0300-U+036F). A stray acute in `потрі́бно` is real
// wreckage found in real reviewer edits: broken there, the hint would sit under
// `потрі` and `бно` — two fragments the writer cannot act on — instead of under
// the one word that is actually wrong.
var WORD_RE = /[Ѐ-ӿ̀-ͯ’'ʼ]+/g;

// The form a word is JUDGED in — the twin of tools/build_wordlist.py, which
// folds the shipped list the same way. Lowercase because a sentence-initial
// capital is not a mistake, and one apostrophe shape because an editor may
// produce ' or ʼ where the project writes ’. Divergence here would underline
// correct words, so keep the two in step.
function normalizeWord(word) {
  return word.toLowerCase().replace(/['ʼ]/g, '’');
}

// The same word as the hunspell dictionary spells it. The vendored uk_UA
// dictionary keys its 5420 apostrophe entries with the straight apostrophe and
// none with the typographic one the project writes, so without this every
// ordinary Ukrainian word with an apostrophe — `розв’язати`, `об’єкт`, `сім’я` —
// comes back unknown and gets underlined as a mistake.
function dictionaryForm(word) {
  return word.replace(/’/g, "'");
}

// Spans of the words `isKnown` rejects, as offsets into `text`.
function findUnknownWords(text, isKnown) {
  var hits = [];
  var m;
  // A module-level /g regex carries lastIndex between calls: without this, the
  // second call would start mid-text and hints would vanish from the beginning
  // of a cell as the user typed.
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(String(text == null ? '' : text)))) {
    if (isKnown(normalizeWord(m[0]))) continue;
    hits.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  }
  return hits;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findUnknownWords: findUnknownWords,
    normalizeWord: normalizeWord,
    dictionaryForm: dictionaryForm,
  };
}
