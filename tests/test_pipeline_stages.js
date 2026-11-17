// Pipeline stage computation (site/js/pipeline_stages.js).
//
// A video declared `sync: ignored` gets no whisper.json and no subtitles —
// by design. Counting it left a finished talk at "2/3" forever and kept its
// card on "in progress" (1997 Adi Shakti Puja, wordless "Impressions" video).
const { describe, it } = require('node:test');
const assert = require('node:assert');

const { getPipelineStages, getOverallStatus } = require('../site/js/pipeline_stages');

function talk(videos, whisperSlugs) {
  return { title: 'T', videos: videos, _whisperSlugs: whisperSlugs, hasUk: true, hasReviewReport: true };
}

describe('getPipelineStages: ignored videos', () => {
  it('does not count a declared-ignored video', () => {
    var s = getPipelineStages(talk([
      { slug: 'Talk', sync: 'primary', hasSrt: true },
      { slug: 'Short', sync: 'derived', hasSrt: true },
      { slug: 'Impressions', sync: 'ignored', hasSrt: false },
    ], ['Talk', 'Short']), null);
    assert.strictEqual(s.whisperProgress, '2/2');
    assert.strictEqual(s.srtProgress, '2/2');
    assert.strictEqual(s.whisper, true);
    assert.strictEqual(s.srt, true);
    assert.strictEqual(s.nVideos, 2);
  });

  it('does not let an ignored video\'s own artefacts stand in for a missing one', () => {
    // Four ignored videos in the corpus do carry a whisper.json.
    var s = getPipelineStages(talk([
      { slug: 'Talk', sync: 'primary', hasSrt: false },
      { slug: 'Intro', sync: 'ignored', hasSrt: true },
    ], ['Intro']), null);
    assert.strictEqual(s.whisperProgress, '0/1');
    assert.strictEqual(s.srtProgress, '0/1');
    assert.strictEqual(s.whisper, false);
    assert.strictEqual(s.srt, false);
  });

  it('still counts every video of a talk that declares nothing', () => {
    var s = getPipelineStages(talk([
      { slug: 'A', hasSrt: true },
      { slug: 'B', hasSrt: false },
    ], ['A']), null);
    assert.strictEqual(s.whisperProgress, '1/2');
    assert.strictEqual(s.srtProgress, '1/2');
    assert.strictEqual(s.srt, false);
  });

  it('a talk whose every video is ignored has nothing done', () => {
    var s = getPipelineStages(talk([{ slug: 'A', sync: 'ignored', hasSrt: false }], []), null);
    assert.strictEqual(s.whisper, false);
    assert.strictEqual(s.srt, false);
    assert.strictEqual(s.srtProgress, '0');
  });
});

// A text-only talk has no counted video: no whisper, no subtitles,
// and its transcript alone is what goes to review.
describe('getPipelineStages: text-only talks', () => {
  it('a talk without videos is text-only', () => {
    assert.strictEqual(getPipelineStages(talk(undefined, []), null).textOnly, true);
    assert.strictEqual(getPipelineStages(talk([], []), null).textOnly, true);
  });

  it('a talk whose every video is ignored is text-only', () => {
    var s = getPipelineStages(talk([{ slug: 'A', sync: 'ignored', hasSrt: false }], []), null);
    assert.strictEqual(s.textOnly, true);
  });

  it('a talk whose meta.yaml has not loaded yet is not text-only', () => {
    // buildManifest starts every talk with videos: [] and no title; only a
    // parsed meta.yaml fills them. Until then the talk is unknown, not text-only.
    var s = getPipelineStages({ videos: [], _whisperSlugs: [], hasUk: true }, null);
    assert.strictEqual(s.textOnly, false);
  });

  it('a talk with a counted video is not text-only', () => {
    var s = getPipelineStages(talk([{ slug: 'A', hasSrt: false }], []), null);
    assert.strictEqual(s.textOnly, false);
  });
});

describe('getOverallStatus', () => {
  var ISSUE = { status: 'pending', issue_number: 325 };
  function textOnlyTalk(hasUk) { return { title: 'Text-only talk', videos: [], _whisperSlugs: [], hasUk: hasUk, hasReviewReport: true }; }

  it('a translated text-only talk with a Review: issue needs review', () => {
    assert.strictEqual(getOverallStatus(getPipelineStages(textOnlyTalk(true), ISSUE), ISSUE), 'ready-for-review');
  });

  it('a text-only talk without a Review: issue is still in progress', () => {
    assert.strictEqual(getOverallStatus(getPipelineStages(textOnlyTalk(true), null), null), 'in-progress');
  });

  it('an untranslated text-only talk is in progress even with an issue', () => {
    assert.strictEqual(getOverallStatus(getPipelineStages(textOnlyTalk(false), ISSUE), ISSUE), 'in-progress');
  });

  it('a video talk still needs its subtitles', () => {
    var tk = talk([{ slug: 'A', hasSrt: false }], ['A']);
    assert.strictEqual(getOverallStatus(getPipelineStages(tk, ISSUE), ISSUE), 'in-progress');
    tk = talk([{ slug: 'A', hasSrt: true }], ['A']);
    assert.strictEqual(getOverallStatus(getPipelineStages(tk, ISSUE), ISSUE), 'ready-for-review');
  });

  it('the review status outranks the artefacts', () => {
    var s = getPipelineStages(textOnlyTalk(true), ISSUE);
    assert.strictEqual(getOverallStatus(s, { status: 'approved' }), 'approved');
    assert.strictEqual(getOverallStatus(s, { status: 'in-progress' }), 'in-review');
  });
});
