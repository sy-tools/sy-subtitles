const { describe, it } = require('node:test');
const assert = require('node:assert');
const { subtitleTracks } = require('../site/js/help_sheet');

describe('subtitleTracks', () => {
  it('offers every language the video has, Ukrainian first', () => {
    const tracks = subtitleTracks('h1Ab-_', ['en', 'uk'], 'uk');
    assert.deepStrictEqual(tracks.map((t) => [t.lang, t.label, t.src]), [
      ['uk', 'Українська', 'help/subs/h1Ab-_.uk.vtt'],
      ['en', 'English', 'help/subs/h1Ab-_.en.vtt'],
    ]);
  });

  it('turns English on for an English interface', () => {
    const tracks = subtitleTracks('h1x', ['uk', 'en'], 'en');
    assert.deepStrictEqual(tracks.map((t) => [t.lang, t.default]), [['uk', false], ['en', true]]);
  });

  it('leaves subtitles off for a Ukrainian interface', () => {
    assert.ok(subtitleTracks('h1x', ['uk', 'en'], 'uk').every((t) => !t.default));
  });

  it('offers nothing for a video without subtitles, and skips languages it cannot label', () => {
    assert.deepStrictEqual(subtitleTracks('h1x', undefined, 'en'), []);
    assert.deepStrictEqual(subtitleTracks('h1x', ['de', 'uk'], 'uk').map((t) => t.lang), ['uk']);
  });
});
