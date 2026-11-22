const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  encodeHelpRef,
  decodeHelpRef,
  helpVideoUrl,
  formatDuration,
  HELP_SECTIONS,
} = require('../site/js/help_videos');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'site', 'js', 'help_videos.js'), 'utf8');
const allVideos = () => HELP_SECTIONS.flatMap((s) => s.videos);

describe('help video refs', () => {
  it('round-trip an id through encode and decode', () => {
    assert.strictEqual(decodeHelpRef(encodeHelpRef('k3x9q2m7a1bd')), 'k3x9q2m7a1bd');
  });

  it('never carry the id in plain sight', () => {
    const ref = encodeHelpRef('k3x9q2m7a1bd');
    assert.ok(ref.startsWith('h1'), ref);
    assert.ok(!ref.includes('k3x9q2m7a1bd'), ref);
  });

  it('refuse an id that is not 12 lowercase letters or digits', () => {
    assert.throws(() => encodeHelpRef('Intro.mp4'));
    assert.throws(() => encodeHelpRef('k3x9q2m7a1b'));
  });

  it('refuse a ref of another version or one that decodes to garbage', () => {
    assert.throws(() => decodeHelpRef('r1' + encodeHelpRef('k3x9q2m7a1bd').slice(2)));
    assert.throws(() => decodeHelpRef('h1AAAA'));
    assert.throws(() => decodeHelpRef(''));
  });

  it('resolve to the sy-help Pages site', () => {
    assert.strictEqual(
      helpVideoUrl(encodeHelpRef('k3x9q2m7a1bd')),
      'https://sy-tools.github.io/sy-help/v/k3x9q2m7a1bd.mp4',
    );
  });
});

describe('formatDuration', () => {
  it('shows minutes and seconds, rounding to the nearest second', () => {
    assert.strictEqual(formatDuration(87.7), '1:28');
    assert.strictEqual(formatDuration(951.1), '15:51');
    assert.strictEqual(formatDuration(5), '0:05');
  });

  it('adds hours only when the video reaches one', () => {
    assert.strictEqual(formatDuration(3600), '1:00:00');
    assert.strictEqual(formatDuration(3725), '1:02:05');
  });
});

describe('HELP_SECTIONS', () => {
  it('lists the guide first and the updates after it', () => {
    assert.deepStrictEqual(HELP_SECTIONS.map((s) => s.id), ['guide', 'updates']);
    for (const s of HELP_SECTIONS) assert.ok(s.title && s.videos.length, s.id);
  });

  it('gives every video a title, a positive duration and a ref that decodes', () => {
    for (const v of allVideos()) {
      assert.ok(v.title, JSON.stringify(v));
      assert.ok(v.duration > 0, v.title);
      assert.match(decodeHelpRef(v.ref), /^[a-z0-9]{12}$/, v.title);
    }
  });

  it('points no two videos at the same file', () => {
    const ids = allVideos().map((v) => decodeHelpRef(v.ref));
    assert.strictEqual(new Set(ids).size, ids.length);
  });

  it('keeps every decoded id out of the shipped source', () => {
    for (const v of allVideos()) {
      const id = decodeHelpRef(v.ref);
      assert.ok(!SOURCE.includes(id), `${v.title}: id ${id} appears in plain text`);
    }
  });

  it('puts the newest update first, each with what it changed', () => {
    const updates = HELP_SECTIONS.find((s) => s.id === 'updates').videos;
    const dates = updates.map((v) => v.date);
    assert.deepStrictEqual(dates, [...dates].sort().reverse());
    for (const v of updates) {
      assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/, v.title);
      assert.ok(v.notes.length > 0, v.title);
    }
  });
});
