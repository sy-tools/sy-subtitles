// Pipeline stage computation (site/js/pipeline_stages.js).
//
// A video declared `sync: ignored` gets no whisper.json and no subtitles —
// by design. Counting it left a finished talk at "2/3" forever and kept its
// card on "in progress" (1997 Adi Shakti Puja, wordless "Impressions" video).
const { describe, it } = require('node:test');
const assert = require('node:assert');

const { getPipelineStages } = require('../site/js/pipeline_stages');

function talk(videos, whisperSlugs) {
  return { videos: videos, _whisperSlugs: whisperSlugs, hasUk: true, hasReviewReport: true };
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
