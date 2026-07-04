const { describe, it } = require('node:test');
const assert = require('node:assert');
const { isTranscriptBodyParagraph } = require('../site/js/bookmarklet');

// The bookmarklet scrapes each <p> of the amruta talk page into the transcript
// body. A blunt "paragraph must be longer than 20 chars" gate silently dropped
// legitimate short lines — e.g. the opening "Welcome to you all." (19 chars) and
// the closing "May God bless you." (18 chars) — losing them from the transcript,
// the translation, and the final subtitles (regression: 1989-12-17 Devi Puja).
describe('bookmarklet: transcript paragraph filter', () => {
  it('keeps a short real closing line ("May God bless you.")', () => {
    assert.strictEqual(isTranscriptBodyParagraph('May God bless you.'), true);
  });

  it('keeps a short real opening line ("Welcome to you all.")', () => {
    assert.strictEqual(isTranscriptBodyParagraph('Welcome to you all.'), true);
  });

  it('keeps a normal prose paragraph', () => {
    assert.strictEqual(
      isTranscriptBodyParagraph('There is no need to discuss in Sahaja Yoga.'),
      true
    );
  });

  it('drops an empty paragraph', () => {
    assert.strictEqual(isTranscriptBodyParagraph(''), false);
  });

  it('drops the metadata header line (contains "Talk Language:")', () => {
    assert.strictEqual(
      isTranscriptBodyParagraph(
        '17 December 1989 Devi Puja: Nothing to discuss in Sahaja Yoga ' +
          'Alibag (India) Talk Language: English | Transcript (English)'
      ),
      false
    );
  });
});
