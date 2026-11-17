const { describe, it } = require('node:test');
const assert = require('node:assert');
const { talkActionVisibility, previewRedirect } = require('../site/js/talk_actions');

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

// A preview link to a text-only talk has no player to open: it
// goes to the transcript review instead of a blank page.
describe('previewRedirect', () => {
  it('sends a talk without videos to its review', () => {
    assert.strictEqual(previewRedirect({ id: '2001-02-03_Text-Only-Talk', title: 'Text-only talk' }), '#/review/2001-02-03_Text-Only-Talk');
    assert.strictEqual(previewRedirect({ id: '2001-02-03_Text-Only-Talk', title: 'Text-only talk', videos: [] }), '#/review/2001-02-03_Text-Only-Talk');
  });

  it('sends a talk whose every video is ignored to its review', () => {
    var tk = { id: 'T', title: 'T', videos: [video({ sync: 'ignored' })] };
    assert.strictEqual(previewRedirect(tk), '#/review/T');
  });

  it('leaves a talk with a video alone, and an unknown talk too', () => {
    assert.strictEqual(previewRedirect({ id: 'T', videos: [video()] }), null);
    assert.strictEqual(previewRedirect(null), null);
  });

  it('leaves a talk whose meta.yaml has not loaded alone', () => {
    assert.strictEqual(previewRedirect({ id: 'T', videos: [] }), null);
  });
});
