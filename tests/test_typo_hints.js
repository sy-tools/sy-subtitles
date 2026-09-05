const { describe, it } = require('node:test');
const assert = require('node:assert');
const { findUnknownWords, isKnownWith } = require('../site/js/typo_hints');

// The real composition, over a wordlist standing in for the shipped one and a
// dictionary that knows nothing. Built this way rather than as a bare set so
// these tests exercise the same path the browser does — the words below are
// judged exactly as the worker would judge them.
const knows = (...words) => isKnownWith(new Set(words), () => false);

describe('findUnknownWords', () => {
  it('reports the span of a word the oracle does not know', () => {
    const text = 'ваші відрації слабшають';

    assert.deepStrictEqual(findUnknownWords(text, knows('ваші', 'слабшають')), [
      { start: 5, end: 13, word: 'відрації' },
    ]);
  });

  it('leaves a sentence-initial capital to the oracle to forgive', () => {
    // The wordlist is folded to lowercase and the oracle folds a word before
    // looking it up there, so a capital at the start of a sentence is not a
    // mistake. This module hands the word over as written — see isKnownWith.
    const hits = findUnknownWords('Вібрації течуть', knows('вібрації', 'течуть'));

    assert.deepStrictEqual(hits, []);
  });

  it('keeps an apostrophe inside the word', () => {
    // `п'ять` is one word. Split, the halves are not words at all, and the hint
    // would sit under a fragment the writer cannot act on.
    const hits = findUnknownWords("вони пʼять разів", knows('вони', 'п’ять', 'разів'));

    assert.deepStrictEqual(hits, []);
  });

  it('does not judge Latin words', () => {
    // A Ukrainian talk carries names and codes in Latin. The oracle only knows
    // Ukrainian, so judging these would underline every one of them.
    const hits = findUnknownWords('дивіться Sahaja Yoga', knows('дивіться'));

    assert.deepStrictEqual(hits, []);
  });

  it('reports each occurrence, so every one can be underlined', () => {
    const hits = findUnknownWords('відрації і відрації', knows('і'));

    assert.deepStrictEqual(
      hits.map((h) => h.start),
      [0, 11]
    );
  });

  it('hints on the word, not on the quotes around it', () => {
    // An apostrophe belongs to a word only BETWEEN letters. Taken greedily, the
    // hint stretched over the quote marks — and `туру ’89` produced a "word"
    // that was a lone apostrophe.
    const hits = findUnknownWords('він сказав ’відрації’', knows('він', 'сказав'));

    assert.deepStrictEqual(hits, [{ start: 12, end: 20, word: 'відрації' }]);
  });

  it('says nothing about a single letter', () => {
    // `Ч. П. Шрівастава` — initials, and the only thing the whole corpus still
    // tripped on. A lone letter is never a correction anyone can act on, and
    // the real one-letter Ukrainian words (я, у, в, і, з) are in the dictionary
    // anyway, so there is nothing to lose by staying quiet.
    assert.deepStrictEqual(findUnknownWords('пані Ч. П. Шрівастава', knows('пані', 'шрівастава')), []);
  });

  it('finds no word in a bare apostrophe', () => {
    assert.deepStrictEqual(findUnknownWords('туру ’89', knows('туру')), []);
  });

  it('keeps a word whole across a stray combining accent', () => {
    // `потрі́бно` carries U+0301 between its halves — real wreckage from a real
    // reviewer's edit. Splitting there would underline `потрі` and `бно`, two
    // fragments the writer cannot act on, instead of the one broken word.
    const hits = findUnknownWords('цей вузол потрі́бно', knows('цей', 'вузол', 'потрібно'));

    assert.deepStrictEqual(
      hits.map((h) => h.word),
      ['потрі́бно']
    );
  });

  it('starts clean on every call', () => {
    // The word pattern is a module-level /g regex: a leftover lastIndex would
    // make the second call skip the start of the text, so hints would vanish
    // from the beginning of a cell as the user typed.
    const text = 'відрації';
    const first = findUnknownWords(text, knows());

    assert.deepStrictEqual(findUnknownWords(text, knows()), first);
  });
});

// Twin parity ---------------------------------------------------------------
//
// tools/build_wordlist.py folds the shipped list; this module folds what the
// user types before looking it up. Both read this fixture, so the two cannot
// drift apart into a list keyed one way and queried another.
const fs = require('fs');
const path = require('path');
const { normalizeWord } = require('../site/js/typo_hints');

const CASES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'wordlist_normalization_cases.json'), 'utf8')
).cases;

describe('normalizeWord — twin of tools/build_wordlist.py', () => {
  for (const c of CASES) {
    it(`${c.input} -> ${c.word} (${c.why})`, () => {
      assert.equal(normalizeWord(c.input), c.word);
    });
  }
});

describe('dictionaryForm', () => {
  const { dictionaryForm } = require('../site/js/typo_hints');

  it('hands hunspell the apostrophe its own entries are keyed with', () => {
    // The vendored uk_UA dictionary spells 5420 entries with the straight
    // apostrophe and not one with the typographic apostrophe the project
    // writes. Asked about `розв’язати` it says no — and every ordinary
    // Ukrainian word with an apostrophe would be underlined as a mistake.
    assert.equal(dictionaryForm('розв’язати'), "розв'язати");
  });

  it('leaves a word without an apostrophe untouched', () => {
    assert.equal(dictionaryForm('вібрації'), 'вібрації');
  });
});

// The oracle -----------------------------------------------------------------
//
// Two sources, two conventions, composed here so the composition itself can be
// tested: the shipped wordlist is folded (lowercase, typographic apostrophe),
// while hunspell is asked about the word AS WRITTEN, in its own apostrophe.
describe('isKnownWith', () => {
  const { isKnownWith } = require('../site/js/typo_hints');
  // Stands in for the real dictionary — these are the answers it actually gives.
  const HUNSPELL = new Set(['Індія', 'Христос', 'вібрації', "розв'язати"]);
  const known = isKnownWith(new Set(['ґрантхі']), (w) => HUNSPELL.has(w));

  it('accepts a proper noun the dictionary only holds capitalised', () => {
    // Ісус, Христос, Крішна, Лакшмі — the vocabulary this material is made of.
    // Lowercasing before asking made hunspell reject all 610 such forms in the
    // corpus, and the wordlist cannot rescue them: the builder had already
    // counted them as spelled and left them out.
    assert.equal(known('Індія'), true);
    assert.equal(known('Христос'), true);
  });

  it('still rejects that noun written in lowercase', () => {
    // Not a workaround with a side effect — `індія` IS wrong in Ukrainian, and
    // judging the word as written is what makes both answers right.
    assert.equal(known('індія'), false);
  });

  it('accepts a wordlist term at the start of a sentence', () => {
    // The list is folded to lowercase, so it must be asked in that form or the
    // first word of a sentence would be underlined.
    assert.equal(known('Ґрантхі'), true);
  });

  it('asks the dictionary in the apostrophe its entries are keyed with', () => {
    assert.equal(known('розв’язати'), true);
  });

  it('rejects a word neither source has', () => {
    assert.equal(known('відрації'), false);
  });
});

// Against the real dictionary -------------------------------------------------
//
// Everything above judges words through a stand-in oracle, and the e2e serves a
// six-word dictionary — which is exactly how a case bug once shipped that
// underlined `Ісус`, `Христос`, `Крішна` and `Лакшмі`, 610 forms of this
// material's own vocabulary. This asks the real dictionary and the real shipped
// list, through the real composition. Its twin in tests/test_build_wordlist.py
// puts the same table to the builder, so the two halves cannot drift apart.
//
// Loading 9 MB of hunspell costs a few seconds; it runs once for the file.
describe('the real dictionary and the shipped list', () => {
  const Typo = require('../site/js/vendor/typo.js');
  const dictDir = path.join(__dirname, '..', 'site', 'dict');
  const read = (f) => fs.readFileSync(path.join(dictDir, f), 'utf8');
  const dictionary = new Typo('uk_UA', read('uk_UA.aff'), read('uk_UA.dic'), {});
  const shipped = new Set(read('words_uk.txt').split('\n').filter(Boolean));
  const known = isKnownWith(shipped, (w) => dictionary.check(w));

  const CASES = [
    // Proper nouns the dictionary holds only capitalised. Judged as written, so
    // the correct spelling passes...
    ['Ісус', true],
    ['Христос', true],
    ['Лакшмі', true],
    ['Індія', true],
    // ...and the lowercase spelling of a name is still called out.
    ['індія', false],
    // Ordinary words carrying the apostrophe the project writes, against a
    // dictionary that keys its 5420 apostrophe entries with the straight one.
    ['розв’язати', true],
    ['сім’я', true],
    // Vocabulary only the shipped list can vouch for.
    ['Ґрантхі', true],
    ['абхішека', true],
    // Real defects from the manual pass this feature automates (PR #1017).
    ['відрації', false],
    ['думаєие', false],
    ['дужде', false],
    ['пробуддженням', false],
  ];

  for (const [word, expected] of CASES) {
    it(`${word} is ${expected ? 'known' : 'flagged'}`, () => {
      assert.equal(known(word), expected);
    });
  }
});
