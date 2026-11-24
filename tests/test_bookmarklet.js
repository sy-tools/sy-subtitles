const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isTranscriptBodyParagraph,
  youtubeIdFromHref,
  driveFileIdFromHref,
  bunnyIdFromHref,
} = require('../site/js/bookmarklet');
const { encodeVideoRef, decodeVideoSource } = require('../site/js/vimeo_codec');

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

// amruta.org moved its talks from Vimeo to YouTube (with Google Drive MP4
// mirrors). The DOM walk itself is exercised against the saved page in a real
// browser (tests/test_preview_spa.py, TestBookmarkletExtraction — Node has no
// DOM); these are the two id parsers it leans on. All ids are synthetic.
describe('bookmarklet: YouTube id from a "Watch on YouTube" link', () => {
  it('reads a youtu.be short link', () => {
    assert.strictEqual(youtubeIdFromHref('https://youtu.be/AbCdEfGhIjK'), 'AbCdEfGhIjK');
  });

  it('reads a youtu.be link that carries a start time', () => {
    assert.strictEqual(youtubeIdFromHref('https://youtu.be/AbCdEfGhIjK?t=360'), 'AbCdEfGhIjK');
  });

  it('reads a youtube.com/watch link, v= first or not', () => {
    assert.strictEqual(
      youtubeIdFromHref('https://www.youtube.com/watch?v=AbCdEfGhIjK'),
      'AbCdEfGhIjK'
    );
    assert.strictEqual(
      youtubeIdFromHref('https://www.youtube.com/watch?t=5&v=AbCdEfGhIjK#x'),
      'AbCdEfGhIjK'
    );
  });

  it('returns "" for a path after the id, as the codec does', () => {
    assert.strictEqual(youtubeIdFromHref('https://youtu.be/AbCdEfGhIjK/extra'), '');
  });

  it('returns "" for an id of the wrong length', () => {
    assert.strictEqual(youtubeIdFromHref('https://youtu.be/AbCdEfGhIj'), '');
    assert.strictEqual(youtubeIdFromHref('https://youtu.be/AbCdEfGhIjKL'), '');
  });

  it('returns "" for a link that is not YouTube, and for nothing at all', () => {
    assert.strictEqual(
      youtubeIdFromHref('https://player.mediadelivery.net/play/000000/AbCdEfGhIjK'),
      ''
    );
    assert.strictEqual(youtubeIdFromHref(''), '');
    assert.strictEqual(youtubeIdFromHref(null), '');
  });
});

describe('bookmarklet: Google Drive file id from a download link', () => {
  it('reads the id out of /file/d/<id>/view', () => {
    assert.strictEqual(
      driveFileIdFromHref('https://drive.google.com/file/d/1Syntheticdriveid00abcdefghijklmn/view'),
      '1Syntheticdriveid00abcdefghijklmn'
    );
  });

  it('reads the id when nothing follows it', () => {
    assert.strictEqual(
      driveFileIdFromHref('https://drive.google.com/file/d/1Syntheticdriveid00abcdefghijklmn'),
      '1Syntheticdriveid00abcdefghijklmn'
    );
  });

  it('returns "" for a folder link, a too-short id, and nothing at all', () => {
    assert.strictEqual(
      driveFileIdFromHref('https://drive.google.com/drive/folders/1Syntheticdriveid00abcdefghijklmn'),
      ''
    );
    assert.strictEqual(driveFileIdFromHref('https://drive.google.com/file/d/short/view'), '');
    assert.strictEqual(driveFileIdFromHref(''), '');
  });
});

// bookmarklet.js runs inside the amruta.org page, where js/vimeo_codec.js is
// not loaded, so it carries its own copy of the codec's URL shapes. A copy
// drifts: a link the scraper accepts and the codec refuses becomes a form row
// that cannot be stored. So both read the same links here and must agree on
// every one — accepted or not, and on the id.
describe('bookmarklet: reads links exactly as js/vimeo_codec.js does', () => {
  const YT = 'AbCdEfGhIjK';
  const GD = '1Syntheticdriveid00abcdefghijklmn';
  const BN = '123456/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
  const HREFS = [
    // YouTube shapes the codec knows
    'https://youtu.be/' + YT,
    'http://youtu.be/' + YT,
    'youtu.be/' + YT,
    'https://youtu.be/' + YT + '/',
    'https://youtu.be/' + YT + '?t=360',
    'https://youtu.be/' + YT + '#t=5',
    'https://YOUTU.BE/' + YT,
    '  https://youtu.be/' + YT + '  ',
    'https://www.youtube.com/watch?v=' + YT,
    'https://youtube.com/watch?v=' + YT,
    'https://m.youtube.com/watch?v=' + YT,
    'https://www.youtube.com/watch?t=5&v=' + YT + '#x',
    'https://www.youtube.com/watch?v=' + YT + '&list=PLx',
    'https://www.youtube.com/embed/' + YT,
    'https://www.youtube-nocookie.com/embed/' + YT + '?rel=0',
    // …and ones it does not
    'https://youtu.be/' + YT + '/extra',
    'https://youtu.be/' + YT + 'L',
    'https://youtu.be/' + YT.slice(1),
    'https://www.youtu.be/' + YT,
    'https://www.youtube.com/shorts/' + YT,
    'https://www.youtube.com/live/' + YT,
    'https://www.youtube.com/v/' + YT,
    'https://music.youtube.com/watch?v=' + YT,
    'https://www.youtube.com/watch?vv=' + YT,
    'https://www.youtube.com/watch#v=' + YT,
    'https://youtu.be/' + YT + ' x',
    'https://youtu.be/AbCdEfGhIj\u043A',
    'https://example.com/?u=https://youtu.be/' + YT,
    'https://player.mediadelivery.net/play/000000/' + YT,
    // Drive shapes the codec knows
    'https://drive.google.com/file/d/' + GD + '/view',
    'https://drive.google.com/file/d/' + GD,
    'https://drive.google.com/file/d/' + GD + '/view?usp=sharing',
    'https://drive.google.com/file/d/' + GD + '?usp=sharing',
    'drive.google.com/file/d/' + GD + '/preview',
    'https://drive.google.com/open?id=' + GD,
    'https://drive.google.com/open?usp=x&id=' + GD + '&y=1',
    // …and ones it does not
    'https://drive.google.com/file/d/' + GD + '!/view',
    'https://drive.google.com/file/d/short/view',
    'https://drive.google.com/drive/folders/' + GD,
    'https://drive.google.com/uc?id=' + GD,
    'https://docs.google.com/file/d/' + GD + '/view',
    // Bunny shapes the codec knows
    'https://player.mediadelivery.net/play/' + BN,
    'https://player.mediadelivery.net/play/' + BN + '?autoplay=false&lang=en&t=113',
    'https://player.mediadelivery.net/embed/' + BN + '?autoplay=false&preload=false&lang=en',
    'https://iframe.mediadelivery.net/embed/' + BN,
    'https://player.mediadelivery.net/play/' + BN + '/',
    'player.mediadelivery.net/play/' + BN + '#t=5',
    'https://player.mediadelivery.net/play/' + BN.toUpperCase(),
    // …and ones it does not
    'https://player.mediadelivery.net/watch/' + BN,
    'https://player.mediadelivery.net/play/' + BN + '0',
    'https://player.mediadelivery.net/play/' + BN.split('/')[1],
    'https://player.mediadelivery.net/play/abc/' + BN.split('/')[1],
    'https://player.mediadelivery.net.evil.example/play/' + BN,
    'https://video.bunnycdn.com/play/' + BN,
    // neither
    'https://vimeo.com/123456/abcd',
    'https://www.amruta.org/1982/07/12/x/',
    '',
  ];

  function codecId(href, provider) {
    try {
      const src = decodeVideoSource(encodeVideoRef(href));
      return src.provider === provider ? src.id : '';
    } catch (e) {
      return '';
    }
  }

  for (const href of HREFS) {
    it('agrees on ' + JSON.stringify(href), () => {
      assert.strictEqual(youtubeIdFromHref(href), codecId(href, 'yt'), 'YouTube id');
      assert.strictEqual(driveFileIdFromHref(href), codecId(href, 'gd'), 'Drive file id');
      assert.strictEqual(bunnyIdFromHref(href), codecId(href, 'bn'), 'Bunny id');
    });
  }

  it('the list exercises both outcomes for both providers', () => {
    const yt = HREFS.map((h) => codecId(h, 'yt'));
    const gd = HREFS.map((h) => codecId(h, 'gd'));
    assert.ok(yt.filter(Boolean).length >= 10 && gd.filter(Boolean).length >= 5);
    assert.ok(yt.filter((x) => !x).length >= 10 && gd.filter((x) => !x).length >= 5);
    const bn = HREFS.map((h) => codecId(h, 'bn'));
    assert.ok(bn.filter(Boolean).length >= 5 && bn.filter((x) => !x).length >= 5);
  });
});
