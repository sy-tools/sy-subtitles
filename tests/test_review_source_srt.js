'use strict';
// Tests for site/js/review_source_srt.js — which file feeds the LEFT
// (source-language) column of the SRT review, and which languages it offers.
//
// The rule mirrors tools/srt_utils.timing_en_srt: source/<lang>.srt is the
// file as downloaded and is never edited; a corrected one (re-timed, or built
// where none was published) lives in final/<lang>.srt and wins when present.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { sourcesMentioning } = require('./spa_sources');

const {
  REVIEW_TARGET_LANG,
  reviewSourceSrtLangs,
  resolveReviewSourceSrt,
} = require('../site/js/review_source_srt.js');

function talk(finalLangs, sourceLangs) {
  const t = { _srtLangs: {}, _srtSha: {}, _srcSrtLangs: {}, _srcSrtSha: {} };
  if (finalLangs) {
    t._srtLangs.V = finalLangs.slice();
    finalLangs.forEach((l) => { t._srtSha['V/' + l] = 'final-' + l; });
  }
  if (sourceLangs) {
    t._srcSrtLangs.V = sourceLangs.slice();
    sourceLangs.forEach((l) => { t._srcSrtSha['V/' + l] = 'source-' + l; });
  }
  return t;
}

test('the target language is Ukrainian', () => {
  assert.equal(REVIEW_TARGET_LANG, 'uk');
});


test('final/en.srt wins over source/en.srt, and carries its own sha (Diwali 1987)', () => {
  const r = resolveReviewSourceSrt(talk(['en', 'uk'], ['en']), 'V', 'en');
  assert.deepEqual(r, { dir: 'final', sha: 'final-en', relPath: 'V/final/en.srt' });
});

test('a video with only final/en.srt loads it (Bhoomi Devi Puja 1982)', () => {
  const r = resolveReviewSourceSrt(talk(['en'], null), 'V', 'en');
  assert.deepEqual(r, { dir: 'final', sha: 'final-en', relPath: 'V/final/en.srt' });
});

test('without a corrected file the downloaded source/en.srt is loaded', () => {
  const r = resolveReviewSourceSrt(talk(['uk'], ['en']), 'V', 'en');
  assert.deepEqual(r, { dir: 'source', sha: 'source-en', relPath: 'V/source/en.srt' });
});

test('the preference holds for any source language, not just English', () => {
  const r = resolveReviewSourceSrt(talk(['en', 'hi', 'uk'], ['en', 'hi']), 'V', 'hi');
  assert.deepEqual(r, { dir: 'final', sha: 'final-hi', relPath: 'V/final/hi.srt' });
});

test('final/uk.srt is the translation, never a corrected source: a downloaded source/uk.srt stays the left file', () => {
  const r = resolveReviewSourceSrt(talk(['uk'], ['en', 'uk']), 'V', 'uk');
  assert.deepEqual(r, { dir: 'source', sha: 'source-uk', relPath: 'V/source/uk.srt' });
});

test('a language in neither place resolves to source/ with no sha (the fetch 404s into an empty column)', () => {
  const r = resolveReviewSourceSrt(talk(['uk'], null), 'V', 'en');
  assert.deepEqual(r, { dir: 'source', sha: '', relPath: 'V/source/en.srt' });
});

test('the sha never crosses over from the other directory', () => {
  // final/en.srt exists but its sha is unknown: must NOT borrow source's sha,
  // or rawPin would pin a path to another file's blob.
  const t = talk(['en', 'uk'], ['en']);
  delete t._srtSha['V/en'];
  assert.deepEqual(resolveReviewSourceSrt(t, 'V', 'en'),
    { dir: 'final', sha: '', relPath: 'V/final/en.srt' });
});

test('another video of the same talk does not leak its files', () => {
  const t = talk(['en', 'uk'], ['en']);
  t._srcSrtLangs.W = ['en'];
  t._srcSrtSha['W/en'] = 'w-source-en';
  assert.deepEqual(resolveReviewSourceSrt(t, 'W', 'en'),
    { dir: 'source', sha: 'w-source-en', relPath: 'W/source/en.srt' });
});

test('a missing talk or missing maps do not throw', () => {
  const want = { dir: 'source', sha: '', relPath: 'V/source/en.srt' };
  assert.deepEqual(resolveReviewSourceSrt(null, 'V', 'en'), want);
  assert.deepEqual(resolveReviewSourceSrt(undefined, 'V', 'en'), want);
  assert.deepEqual(resolveReviewSourceSrt({}, 'V', 'en'), want);
});


test('a language found only in final/ is available on the left', () => {
  assert.deepEqual(reviewSourceSrtLangs(talk(['en'], null), 'V'), ['en']);
  assert.deepEqual(reviewSourceSrtLangs(talk(['en', 'uk'], null), 'V'), ['en']);
  assert.deepEqual(reviewSourceSrtLangs(talk(['hi', 'uk'], null), 'V'), ['hi']);
});

test('the left list is the union of both places, each language once, sorted', () => {
  assert.deepEqual(
    reviewSourceSrtLangs(talk(['uk', 'hi', 'en'], ['hi', 'en']), 'V'), ['en', 'hi']);
  assert.deepEqual(
    reviewSourceSrtLangs(talk(['en', 'uk'], ['en', 'hi']), 'V'), ['en', 'hi']);
});

test('final/uk.srt alone does not make Ukrainian a left option', () => {
  assert.deepEqual(reviewSourceSrtLangs(talk(['uk'], ['en']), 'V'), ['en']);
});

test('a downloaded source/uk.srt is still offered, as before', () => {
  assert.deepEqual(reviewSourceSrtLangs(talk(['uk'], ['en', 'uk']), 'V'), ['en', 'uk']);
});

test('nothing known falls back to English, as before', () => {
  assert.deepEqual(reviewSourceSrtLangs(talk(['uk'], null), 'V'), ['en']);
  assert.deepEqual(reviewSourceSrtLangs(null, 'V'), ['en']);
  assert.deepEqual(reviewSourceSrtLangs({}, 'V'), ['en']);
});

test('the manifest arrays are not handed out (the dropdown sorts what it is given in place)', () => {
  const t = talk(['uk', 'en'], ['hi', 'en']);
  reviewSourceSrtLangs(t, 'V').push('zz');
  assert.deepEqual(t._srtLangs.V, ['uk', 'en']);
  assert.deepEqual(t._srcSrtLangs.V, ['hi', 'en']);
});


const INDEX = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');

test('index.html loads the module and no longer hard-codes source/ for the left column', () => {
  assert.ok(INDEX.includes('<script src="js/review_source_srt.js"></script>'));
  assert.deepStrictEqual(sourcesMentioning(/'\/source\/' \+ leftLang/), [],
    'the left SRT URL must come from resolveReviewSourceSrt, not a literal source/ path');
  assert.deepStrictEqual(sourcesMentioning(/_srcSrtLangs\[(reviewState\.)?videoSlug\]/), [],
    'the left language list must come from reviewSourceSrtLangs');
  assert.equal((INDEX.match(/resolveReviewSourceSrt\(/g) || []).length, 3,
    'the initial load, the language switch and the column header all resolve the file');
  assert.deepStrictEqual(sourcesMentioning("' (source) "), [],
    'the left header must name the folder resolveReviewSourceSrt picked, not a literal');
  assert.equal((INDEX.match(/reviewSourceSrtLangs\(/g) || []).length, 2,
    'the initial load and the dropdown both list the languages');
});
