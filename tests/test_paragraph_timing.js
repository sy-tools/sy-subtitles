// Transcript-mode video sync — which stretch of the video each transcript
// paragraph is spoken in (site/js/paragraph_timing.js).
//
// The transcript holds more than the subtitles do: a title line, remarks, the
// puja that follows a talk, the parts of a talk another video carries. A
// paragraph like that has no time, and saying so must cost its neighbours
// nothing.

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { parseSRT } = require('../site/js/preview_srt_parser');
const { matchParagraphsToSrt } = require('../site/js/paragraph_timing');

function srtOfTenSecondBlocks(texts) {
  const tc = (s) => '00:' + String(Math.floor(s / 60)).padStart(2, '0') + ':' +
    String(s % 60).padStart(2, '0') + ',000';
  return texts.map((text, i) =>
    (i + 1) + '\n' + tc(i * 10) + ' --> ' + tc(i * 10 + 10) + '\n' + text + '\n').join('\n');
}

function match(paragraphs, blockTexts) {
  return matchParagraphsToSrt(paragraphs, parseSRT(srtOfTenSecondBlocks(blockTexts)));
}

function spanOfBlocks(first, last) {
  return { startMs: (first - 1) * 10000, endMs: (last === undefined ? first : last) * 10000 };
}

const TALK = [
  'This is the first block.',
  'Second block continues here.',
  'Third block, final line.',
  'Fourth block says something new.',
  'Fifth block wraps the talk.',
];

describe('matchParagraphsToSrt', () => {
  it('maps each paragraph to the blocks that spell it', () => {
    const out = match([
      'This is the first block.',
      'Second block continues here. Third block, final line.',
      'Fourth block says something new. Fifth block wraps the talk.',
    ], TALK);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(2, 3), spanOfBlocks(4, 5)]);
  });

  it('ignores case and punctuation', () => {
    assert.deepStrictEqual(match(['THIS is; the, FIRST block!'], TALK), [spanOfBlocks(1)]);
  });

  it('gives an empty paragraph no time', () => {
    const out = match(['', '   ', 'This is the first block.'], TALK);
    assert.deepStrictEqual(out, [null, null, spanOfBlocks(1)]);
  });

  it('gives a paragraph the subtitles do not carry no time, and the next one its own', () => {
    const out = match([
      'This paragraph has nothing in common with the subtitles at all.',
      'Second block continues here.',
    ], TALK);
    assert.deepStrictEqual(out, [null, spanOfBlocks(2)]);
  });

  it('maps a repeated phrase to its own occurrence, in order', () => {
    const out = match(
      ['Shared phrase here.', 'Shared phrase here.'],
      ['Shared phrase here.', 'Different content.', 'Shared phrase here.']);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(3)]);
  });

  it('keeps the anchor of a paragraph whose tail was edited', () => {
    const out = match(['This is the first block but with an extra tail added locally.'], TALK);
    assert.strictEqual(out[0].startMs, 0);
  });
});
