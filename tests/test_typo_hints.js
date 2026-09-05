const { describe, it } = require('node:test');
const assert = require('node:assert');
const { findUnknownWords } = require('../site/js/typo_hints');

// The oracle the browser passes in: hunspell OR the project's wordlist. Here it
// is a plain set, so these tests are about WHICH spans get reported, never about
// how a word is judged.
const knows = (...words) => {
  const set = new Set(words);
  return (word) => set.has(word);
};

describe('findUnknownWords', () => {
  it('reports the span of a word the oracle does not know', () => {
    const text = 'ваші відрації слабшають';

    assert.deepStrictEqual(findUnknownWords(text, knows('ваші', 'слабшають')), [
      { start: 5, end: 13, word: 'відрації' },
    ]);
  });

  it('judges a word by its lowercase form', () => {
    // The wordlist is folded to lowercase, and a sentence-initial capital is
    // not a spelling mistake. Judging the literal form would underline the
    // first word of most sentences.
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
