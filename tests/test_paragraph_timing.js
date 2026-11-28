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

describe('matchParagraphsToSrt — text the subtitles do not carry', () => {
  const SPOKEN = [
    'Today we have gathered here to do the Sahasrara Puja.',
    'The word means one thousand.',
    'And there are one thousand petals in our brain.',
    'So this is what our awareness has to become.',
    'Awareness has to become Paramchaitanya.',
    'May God bless you all.',
  ];
  const TITLE = 'Sahasrara Puja, “Our Awareness has to become Paramchaitanya”, ' +
    'Cabella Ligure (Italy), 9 May 1999.';

  it('does not let a title line swallow the talk', () => {
    const out = match([
      TITLE,
      'Today we have gathered here to do the Sahasrara Puja.',
      'The word means one thousand. And there are one thousand petals in our brain.',
      'So this is what our awareness has to become. Awareness has to become Paramchaitanya.',
      'May God bless you all.',
    ], SPOKEN);
    assert.deepStrictEqual(out, [null, spanOfBlocks(1), spanOfBlocks(2, 3), spanOfBlocks(4, 5), spanOfBlocks(6)]);
  });

  it('does not anchor a short title to the place the talk later says the same words', () => {
    const out = match([
      'Sahasrara Puja',
      'Today we have gathered here to do the worship.',
      'The word means one thousand.',
      'This is the Sahasrara Puja day.',
    ], [
      'Today we have gathered here to do the worship.',
      'The word means one thousand.',
      'This is the Sahasrara Puja day.',
    ]);
    assert.deepStrictEqual(out, [null, spanOfBlocks(1), spanOfBlocks(2), spanOfBlocks(3)]);
  });

  it('leaves what follows the talk without a time', () => {
    const out = match([
      'So this is what our awareness has to become. Awareness has to become Paramchaitanya.',
      'May God bless you all.',
      '(Puja starts)',
      'Yogi: All the children from five to ten years.',
      'Shri Mataji: May God bless you all.',
    ], SPOKEN.slice(3));
    assert.deepStrictEqual(out, [spanOfBlocks(1, 2), spanOfBlocks(3), null, null, null]);
  });

  it('times only the part of the transcript a video carries', () => {
    const out = match([
      'Today we have gathered here to do the Sahasrara Puja.',
      'The word means one thousand. And there are one thousand petals in our brain.',
      'So this is what our awareness has to become.',
      'Awareness has to become Paramchaitanya. May God bless you all.',
    ], SPOKEN.slice(1, 4));
    assert.deepStrictEqual(out, [null, spanOfBlocks(1, 2), spanOfBlocks(3), null]);
  });

  it('steps over a remark the subtitles leave out', () => {
    const out = match([
      'The word means one thousand. (Laughter) And there are one thousand petals in our brain.',
    ], SPOKEN.slice(1, 3));
    assert.deepStrictEqual(out, [spanOfBlocks(1, 2)]);
  });
});

describe('matchParagraphsToSrt — short and repeated subtitles', () => {
  it('places a short repeated subtitle by the one it follows', () => {
    const out = match([
      'Yes. It is so in every one of us.',
      'It works in a very simple manner. Yes.',
      'Yes. That is the point I wanted to make.',
    ], [
      'Yes.', 'It is so in every one of us.',
      'It works in a very simple manner.', 'Yes.',
      'Yes.', 'That is the point I wanted to make.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1, 2), spanOfBlocks(3, 4), spanOfBlocks(5, 6)]);
  });

  it('places a short repeated subtitle by the one it precedes', () => {
    const out = match([
      'Shri Ganesha Puja, Geneva.',
      'Yes. It is so in every one of us.',
      'It works in a very simple manner. Yes.',
    ], [
      'Yes.', 'It is so in every one of us.',
      'It works in a very simple manner.', 'Yes.',
    ]);
    assert.deepStrictEqual(out, [null, spanOfBlocks(1, 2), spanOfBlocks(3, 4)]);
  });

  it('does not pin a video that starts mid-transcript to the transcript\'s first words', () => {
    const out = match(
      ['Yes, the first tape began with something else.', 'Yes. It is so in every one of us.'],
      ['Yes.', 'It is so in every one of us.']);
    assert.deepStrictEqual(out, [null, spanOfBlocks(1, 2)]);
  });

  it('never matches inside a word', () => {
    const out = match(
      ['Artists are the ones who know.', 'Art. It belongs to the Spirit.'],
      ['Artists are the ones who know.', 'Art.', 'It belongs to the Spirit.']);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(2, 3)]);
  });
});

describe('matchParagraphsToSrt — subtitles that differ from the transcript', () => {
  it('keeps a paragraph anchored by the subtitles that still match', () => {
    const out = match([
      'This is the first block. Second block continues here. Third block, final line.',
      'Fourth block says something new. Fifth block wraps the talk.',
    ], [
      'This is the first block.',
      'Second block was reworded here.',
      'Third block, final line.',
      'Fourth block says something new.',
      'Fifth block wraps the talk.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1, 3), spanOfBlocks(4, 5)]);
  });

  it('times a paragraph from a reworded subtitle at its edge', () => {
    const out = match([
      'This is the first block.',
      'Second block continues here. Third block, final line.',
      'Fourth block says something new.',
    ], [
      'This is the first block.',
      'Second block continues over here.',
      'Third block, final line.',
      'Fourth block says something new.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(2, 3), spanOfBlocks(4)]);
  });

  it('gives a subtitle with a left-out remark in its middle to both paragraphs it joins', () => {
    const out = match([
      'You would be in some pub by now! (Laughter)',
      'All right.',
      'Now we come to the point.',
    ], [
      'You would be in some pub by now! All right.',
      'Now we come to the point.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(1), spanOfBlocks(2)]);
  });

  it('gives a subtitle found nowhere near its neighbours to no paragraph', () => {
    const out = match([
      'This is the first block.',
      'Second block continues here.',
    ], [
      'This is the first block.',
      'Applause, and music for a while.',
      'Second block continues here.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(3)]);
  });

  it('gives subtitles the transcript does not hold to no paragraph, whatever words they share', () => {
    const out = match([
      'This is the first block.',
      'Second block continues here.',
      'And so it is for all of you here.',
      'It is the way it has to be done.',
    ], [
      'This is the first block.',
      'Second block continues here.',
      'Bring it here.',
      'So it has to be.',
      'More of you, the girls.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1), spanOfBlocks(2), null, null]);
  });

  it('does not stretch a paragraph to a stray subtitle that quotes it out of order', () => {
    const out = match([
      'This is the first block. Third block, final line.',
      'Fourth block says something new.',
      'Fifth block wraps the talk.',
    ], [
      'This is the first block.',
      'Fifth block wraps the talk.',
      'Third block, final line.',
      'Fourth block says something new.',
      'Fifth block wraps the talk.',
    ]);
    assert.deepStrictEqual(out, [spanOfBlocks(1, 3), spanOfBlocks(4), spanOfBlocks(5)]);
  });

  it('gives a subtitle that spans two paragraphs to both', () => {
    const out = match(
      ['This is the first block. Second block', 'continues here. Third block, final line.'],
      TALK.slice(0, 3));
    assert.deepStrictEqual(out, [spanOfBlocks(1, 2), spanOfBlocks(2, 3)]);
  });

  it('returns one entry per paragraph when there are no subtitles', () => {
    assert.deepStrictEqual(matchParagraphsToSrt(['One.', 'Two.'], []), [null, null]);
  });
});
