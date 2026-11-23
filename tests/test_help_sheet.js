const { describe, it } = require('node:test');
const assert = require('node:assert');
global.HelpVideos = require('../site/js/help_videos');
const { subtitleTracks } = require('../site/js/help_sheet');

const R = 'sy-tools/sy-help';
const base = 'https://sy-tools.github.io/sy-help/subs/';

describe('subtitleTracks', () => {
  it('offers every language the video has, Ukrainian first', () => {
    const tracks = subtitleTracks(R, 'intro', ['en', 'uk'], 'uk');
    assert.deepStrictEqual(tracks.map((t) => [t.lang, t.label, t.src]), [
      ['uk', 'Українська', base + 'intro.uk.vtt'],
      ['en', 'English', base + 'intro.en.vtt'],
    ]);
  });

  it('turns English on for an English interface', () => {
    const tracks = subtitleTracks(R, 'x', ['uk', 'en'], 'en');
    assert.deepStrictEqual(tracks.map((t) => [t.lang, t.default]), [['uk', false], ['en', true]]);
  });

  it('leaves subtitles off for a Ukrainian interface', () => {
    assert.ok(subtitleTracks(R, 'x', ['uk', 'en'], 'uk').every((t) => !t.default));
  });

  it('offers nothing for a video without subtitles, and skips languages it cannot label', () => {
    assert.deepStrictEqual(subtitleTracks(R, 'x', undefined, 'en'), []);
    assert.deepStrictEqual(subtitleTracks(R, 'x', ['de', 'uk'], 'uk').map((t) => t.lang), ['uk']);
  });
});
