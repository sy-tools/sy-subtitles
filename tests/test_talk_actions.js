const { describe, it } = require('node:test');
const assert = require('node:assert');
const { talkActionVisibility } = require('../site/js/talk_actions');

const video = (over) => Object.assign({ slug: 'v1', hasSrt: true, vimeo_url: 'https://vimeo.com/1/a' }, over || {});

describe('talkActionVisibility', () => {
  it('shows both when there are playable subtitles AND EN+UK transcripts', () => {
    const v = talkActionVisibility({ hasEn: true, hasUk: true, videos: [video()] });
    assert.deepStrictEqual(v, { preview: true, review: true });
  });

  it('shows Review (not View) when there is only a transcript, no subtitles', () => {
    // The requested behaviour: a translated talk not yet built into subtitles.
    const v = talkActionVisibility({ hasEn: true, hasUk: true, videos: [] });
    assert.deepStrictEqual(v, { preview: false, review: true });
  });

  it('still shows Review when transcripts exist but the video has no SRT', () => {
    const v = talkActionVisibility({ hasEn: true, hasUk: true, videos: [video({ hasSrt: false })] });
    assert.deepStrictEqual(v, { preview: false, review: true });
  });

  it('shows View (not Review) when subtitles exist but transcripts do not', () => {
    const v = talkActionVisibility({ hasEn: false, hasUk: false, videos: [video()] });
    assert.deepStrictEqual(v, { preview: true, review: false });
  });

  it('requires both EN and UK transcripts for Review', () => {
    assert.strictEqual(talkActionVisibility({ hasEn: true, hasUk: false, videos: [] }).review, false);
    assert.strictEqual(talkActionVisibility({ hasEn: false, hasUk: true, videos: [] }).review, false);
  });

  it('requires a vimeo_url (not just an SRT) for View', () => {
    const v = talkActionVisibility({ videos: [video({ vimeo_url: '' })] });
    assert.strictEqual(v.preview, false);
  });

  it('shows nothing for an empty / missing talk', () => {
    assert.deepStrictEqual(talkActionVisibility({}), { preview: false, review: false });
    assert.deepStrictEqual(talkActionVisibility(null), { preview: false, review: false });
  });
});
