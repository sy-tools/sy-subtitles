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

// An apostrophe belongs to a word only BETWEEN letters. `п'ять` is one word, so
// splitting there would put a hint under a fragment that is not a word at all —
// but a word quoted as ’слово’ is not two characters longer, and `туру ’89`
// holds no word for a hint to land on.
//
// Combining marks (U+0300-U+036F) are part of a word wherever they fall. A stray
// acute in `потрі́бно` is real wreckage from a real reviewer's edit: broken
// there, the hint would sit under `потрі` and `бно` — two fragments the writer
// cannot act on — instead of under the one word that is actually wrong.
//
// Latin letters are part of a word run too, though nothing Latin is ever
// judged. They are here so a word wearing a Latin lookalike — `Mати`, `Toм`,
// `Aле`, `iндивідуально`, 32 of them in the corpus — arrives WHOLE. Reading
// only the Cyrillic left `ати`, and a hint under that points at the wreckage
// while hiding its cause, which is the first letter.
//
// Kept in step with tools/build_wordlist.py, which reads the corpus this way.
var WORD_RE = /[Ѐ-ӿ̀-ͯA-Za-z]+(?:['’ʼ][Ѐ-ӿ̀-ͯA-Za-z]+)*/g;
var CYRILLIC_RE = /[Ѐ-ӿ]/;
var LATIN_RE = /[A-Za-z]/;

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
  // Every shape normalizeWord folds, folded here too. Folding only ’ left the
  // two halves of the oracle disagreeing about U+02BC on its own: the
  // dictionary rejected such a word while the builder, asking through the aff
  // file's `ICONV ʼ '`, counted it spelled and kept it out of the list.
  return word.replace(/[’ʼ]/g, "'");
}

// Composes the two sources into the single question findUnknownWords asks.
//
// Each is consulted in ITS OWN convention, and the word arrives here exactly as
// written. Folding the case first looks harmless and is not: hunspell holds
// Індія, Христос, Крішна and Лакшмі only as capitalised entries, so a lowercased
// query is refused — and the shipped list cannot rescue them, because the
// builder already counted them as spelled and left them out. That underlined
// 610 forms of this material's own vocabulary. Asking as written also keeps the
// other half right: lowercase `індія` really is a mistake.
function isKnownWith(ownWords, check) {
  return function (word) {
    return ownWords.has(normalizeWord(word)) || check(dictionaryForm(word));
  };
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
    // A lone letter is an initial (`Ч. П. Шрівастава`) or a stray keystroke —
    // never a correction anyone can act on. The real one-letter Ukrainian words
    // are in the dictionary anyway, so there is nothing to lose by keeping
    // quiet, and this was the last thing the whole corpus tripped on.
    if (m[0].length < 2) continue;
    var hasCyrillic = CYRILLIC_RE.test(m[0]);
    // A name or a code in Latin. The oracle only knows Ukrainian, so judging
    // these would underline every one of them.
    if (!hasCyrillic) continue;
    // Two scripts glued together with no separator: `Mати`, `iндивідуально`.
    // It is wrong however its pieces are judged, so it is never put to the
    // oracle — asking about `ати` is asking the wrong question, and the answer
    // (yes, once the list had been taught the fragment) hid the defect
    // completely. The corpus holds no legitimate word of this shape.
    if (!LATIN_RE.test(m[0])) {
      // As written: normalising is the oracle's job, and it differs per source.
      if (isKnown(m[0])) continue;
    }
    hits.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  }
  return hits;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findUnknownWords: findUnknownWords,
    normalizeWord: normalizeWord,
    dictionaryForm: dictionaryForm,
    isKnownWith: isKnownWith,
  };
}
