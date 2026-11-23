const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  DEFAULT_HELP_REPO,
  helpRepo,
  pagesBase,
  catalogUrl,
  videoUrl,
  subtitleUrl,
  localized,
  orderedSections,
  formatDuration,
} = require('../site/js/help_videos');

const CATALOG = {
  version: 1,
  sections: [
    {
      id: 'guide',
      title: { uk: 'Як працювати', en: 'How to work' },
      order: 'manual',
      videos: [
        { file: 'b', title: { uk: 'Друге', en: 'Second' } },
        { file: 'a', title: { uk: 'Перше', en: '' } },
      ],
    },
    {
      id: 'updates',
      title: { uk: 'Оновлення', en: 'Updates' },
      order: 'chronological',
      videos: [
        { file: 'u2', date: '2026-11-22' },
        { file: 'u1', date: '2026-09-05', title: { uk: 'Перше оновлення' } },
      ],
    },
  ],
};

describe('help repository', () => {
  it('is sy-tools/sy-help unless the page is pointed elsewhere', () => {
    assert.strictEqual(DEFAULT_HELP_REPO, 'sy-tools/sy-help');
    assert.strictEqual(helpRepo({}), 'sy-tools/sy-help');
    assert.strictEqual(helpRepo({ __SY_HELP_REPO: 'sy-tools/sy-help-staging' }), 'sy-tools/sy-help-staging');
  });

  it('ignores an override that is not owner/name', () => {
    assert.strictEqual(helpRepo({ __SY_HELP_REPO: 'https://evil.example/x' }), 'sy-tools/sy-help');
  });

  it('resolves every file on that repository\'s Pages site', () => {
    const r = 'sy-tools/sy-help-staging';
    assert.strictEqual(pagesBase(r), 'https://sy-tools.github.io/sy-help-staging/');
    assert.strictEqual(catalogUrl(r), 'https://sy-tools.github.io/sy-help-staging/catalog.json');
    assert.strictEqual(videoUrl(r, 'intro-2'), 'https://sy-tools.github.io/sy-help-staging/v/intro-2.mp4');
    assert.strictEqual(subtitleUrl(r, 'intro-2', 'en'), 'https://sy-tools.github.io/sy-help-staging/subs/intro-2.en.vtt');
  });
});

describe('localized', () => {
  it('picks the interface language and falls back to Ukrainian when it is empty', () => {
    assert.strictEqual(localized({ uk: 'Так', en: 'Yes' }, 'en'), 'Yes');
    assert.strictEqual(localized({ uk: 'Так', en: '' }, 'en'), 'Так');
    assert.deepStrictEqual(localized({ uk: ['а'], en: [] }, 'en'), ['а']);
    assert.strictEqual(localized(undefined, 'en'), '');
  });
});

describe('orderedSections', () => {
  const out = orderedSections(CATALOG);

  it('numbers sections and the videos of a manual section by position', () => {
    assert.deepStrictEqual(out.map((s) => s.number), ['1', '2']);
    assert.deepStrictEqual(out[0].videos.map((v) => [v.file, v.number]), [['b', '1.1'], ['a', '1.2']]);
  });

  it('sorts a chronological section oldest first', () => {
    assert.deepStrictEqual(out[1].videos.map((v) => [v.file, v.number]), [['u1', '2.1'], ['u2', '2.2']]);
  });

  it('titles an update by its date when it has no title of its own', () => {
    const u2 = out[1].videos[1];
    assert.deepStrictEqual(u2.displayTitle, { uk: 'Оновлення на 22.11.2026', en: 'Update of 22.11.2026' });
    assert.deepStrictEqual(out[1].videos[0].displayTitle, { uk: 'Перше оновлення' });
  });

  it('leaves the catalog it was given untouched', () => {
    assert.deepStrictEqual(CATALOG.sections[1].videos.map((v) => v.file), ['u2', 'u1']);
    assert.strictEqual(CATALOG.sections[0].videos[0].number, undefined);
  });
});

describe('formatDuration', () => {
  it('shows minutes and seconds, rounding to the nearest second', () => {
    assert.strictEqual(formatDuration(87.7), '1:28');
    assert.strictEqual(formatDuration(5), '0:05');
  });

  it('adds hours only when the video reaches one', () => {
    assert.strictEqual(formatDuration(3725), '1:02:05');
  });

  it('shows nothing for a video whose length is not known yet', () => {
    assert.strictEqual(formatDuration(undefined), '');
  });
});
