'use strict';
// Which file feeds the left (source-language) column of the SRT review,
// single-sourced for the SPA and the Node test suite
// (tests/test_review_source_srt.js).
//
// source/<lang>.srt is the file as downloaded and is never edited; a corrected
// one (re-timed to the speech, or built where none was published) lives in
// final/<lang>.srt. The corrected file is what the Ukrainian is timed from
// (tools/srt_utils.timing_en_srt), so it is also what the reviewer must read
// it against.
//
// final/ holds the translation too. That one is the right column's file and is
// never a "corrected source": the left column neither offers the target
// language because of it nor loads it.

var REVIEW_TARGET_LANG = 'uk';

function _videoLangs(langsBySlug, videoSlug) {
  return (langsBySlug && langsBySlug[videoSlug]) || [];
}

function _correctedSourceLangs(talk, videoSlug) {
  return _videoLangs(talk && talk._srtLangs, videoSlug).filter(function(lang) {
    return lang !== REVIEW_TARGET_LANG;
  });
}

// Always a fresh array: the caller sorts it in place.
function reviewSourceSrtLangs(talk, videoSlug) {
  var langs = _videoLangs(talk && talk._srcSrtLangs, videoSlug).slice();
  _correctedSourceLangs(talk, videoSlug).forEach(function(lang) {
    if (langs.indexOf(lang) === -1) langs.push(lang);
  });
  return langs.length ? langs.sort() : ['en'];
}

// The sha is taken from the same directory as the path: rawPin addresses the
// blob by it, so a sha borrowed from the other copy would serve the wrong file.
function resolveReviewSourceSrt(talk, videoSlug, lang) {
  var corrected = _correctedSourceLangs(talk, videoSlug).indexOf(lang) !== -1;
  var dir = corrected ? 'final' : 'source';
  var shaByKey = talk && (corrected ? talk._srtSha : talk._srcSrtSha);
  return {
    dir: dir,
    sha: (shaByKey && shaByKey[videoSlug + '/' + lang]) || '',
    relPath: videoSlug + '/' + dir + '/' + lang + '.srt'
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REVIEW_TARGET_LANG: REVIEW_TARGET_LANG,
    reviewSourceSrtLangs: reviewSourceSrtLangs,
    resolveReviewSourceSrt: resolveReviewSourceSrt
  };
}
