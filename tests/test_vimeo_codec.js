const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { encodeVideoRef, decodeVideoRef, decodeVideoSource } = require('../site/js/vimeo_codec');

// The contract that keeps the JS codec byte-identical to tools/vimeo_codec.py:
// the same frozen vectors are asserted by tests/test_vimeo_codec.py.
const vectors = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'vimeo_codec_vectors.json'), 'utf-8')
);

// Synthetic, obviously-fake placeholders only — never a real private link.
const CANONICAL_URLS = [
  'https://vimeo.com/111111111/aaaaaaaaaa',
  'https://vimeo.com/222222222/bbbbbbbbbb',
  'https://vimeo.com/123456789',
];

describe('vimeo_codec — round trip', () => {
  CANONICAL_URLS.forEach((url) => {
    it('round-trips ' + url, () => {
      assert.strictEqual(decodeVideoRef(encodeVideoRef(url)), url);
    });
  });
});

describe('vimeo_codec — stored form', () => {
  it('has r1 prefix, no vimeo substring, no slash or padding', () => {
    const ref = encodeVideoRef('https://vimeo.com/111111111/aaaaaaaaaa');
    assert.ok(ref.startsWith('r1'));
    assert.ok(!ref.toLowerCase().includes('vimeo'));
    assert.ok(!ref.includes('/'));
    assert.ok(!ref.includes('='));
    assert.match(ref, /^r1[A-Za-z0-9_-]+$/);
  });
});

describe('vimeo_codec — normalization & errors', () => {
  it('normalizes protocol/www/trailing-slash to canonical on decode', () => {
    ['http://vimeo.com/123/abc', 'https://www.vimeo.com/123/abc/', 'vimeo.com/123/abc'].forEach(
      (variant) => {
        assert.strictEqual(decodeVideoRef(encodeVideoRef(variant)), 'https://vimeo.com/123/abc');
      }
    );
  });

  it('rejects a non-vimeo url', () => {
    assert.throws(() => encodeVideoRef('https://evil.com/123/abc'));
  });

  it('rejects an unknown version on decode', () => {
    assert.throws(() => decodeVideoRef('r9zzzz'));
  });
});

function expectedWatchUrl(vec) {
  if (vec.provider === 'yt') return 'https://www.youtube.com/watch?v=' + vec.id;
  if (vec.provider === 'gd') return 'https://drive.google.com/file/d/' + vec.id + '/view';
  if (vec.provider === 'bn') return 'https://player.mediadelivery.net/play/' + vec.id;
  return vec.url; // r1 vectors are canonical Vimeo URLs
}

describe('vimeo_codec — cross-language vectors (shared with Python)', () => {
  it('reproduces every frozen vector exactly', () => {
    assert.ok(vectors.length > 0, 'vectors file must not be empty');
    vectors.forEach((vec) => {
      assert.strictEqual(encodeVideoRef(vec.url), vec.ref, 'encode mismatch for ' + vec.url);
      assert.strictEqual(decodeVideoRef(vec.ref), expectedWatchUrl(vec), 'decode mismatch for ' + vec.ref);
      const source = decodeVideoSource(vec.ref);
      assert.strictEqual(source.provider, vec.provider || 'vimeo');
      assert.strictEqual(source.watchUrl, expectedWatchUrl(vec));
      if (vec.id) assert.strictEqual(source.id, vec.id);
    });
  });

  it('covers every provider and URL shape', () => {
    const yt = vectors.filter((v) => v.provider === 'yt');
    const gd = vectors.filter((v) => v.provider === 'gd');
    assert.ok(yt.length >= 4 && new Set(yt.map((v) => v.ref)).size === 1);
    const bn = vectors.filter((v) => v.provider === 'bn');
    assert.ok(gd.length >= 2 && new Set(gd.map((v) => v.ref)).size === 1);
    assert.ok(bn.length >= 3 && new Set(bn.map((v) => v.ref)).size === 1);
    yt.concat(gd, bn).forEach((v) => assert.ok(v.ref.startsWith('r2')));
  });
});

// Synthetic ids only — never a real video or file id.
const YT_ID = 'AbCdEfGhIjK';
const GD_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const YT_WATCH = 'https://www.youtube.com/watch?v=' + YT_ID;
const GD_VIEW = 'https://drive.google.com/file/d/' + GD_ID + '/view';

// Builds a ref with an arbitrary payload — the same transform as the codec,
// kept local so a bad payload can be tested without the module exporting it.
function rawRef(version, payload) {
  const KEY = 'sahaja-yoga-subtitles';
  const bytes = [];
  for (let i = 0; i < payload.length; i++) {
    bytes.push(payload.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
  }
  return version + Buffer.from(bytes.reverse()).toString('base64url');
}

describe('vimeo_codec — r2 provider-tagged refs', () => {
  it('decodes an r1 ref to a vimeo source with id and hash', () => {
    const ref = encodeVideoRef('https://vimeo.com/111111111/aaaaaaaaaa');
    assert.deepStrictEqual(decodeVideoSource(ref), {
      provider: 'vimeo',
      id: '111111111/aaaaaaaaaa',
      watchUrl: 'https://vimeo.com/111111111/aaaaaaaaaa',
    });
  });

  it('rawRef helper matches the codec', () => {
    assert.strictEqual(rawRef('r2', 'yt:' + YT_ID), encodeVideoRef(YT_WATCH));
  });

  [
    YT_WATCH,
    'https://youtube.com/watch?v=' + YT_ID + '&t=42s',
    'https://www.youtube.com/watch?feature=share&v=' + YT_ID,
    'https://m.youtube.com/watch?v=' + YT_ID,
    'https://youtu.be/' + YT_ID,
    'https://youtu.be/' + YT_ID + '?si=abc',
    'https://www.youtube.com/embed/' + YT_ID,
    'https://www.youtube.com/embed/' + YT_ID + '?rel=0',
    'https://www.youtube-nocookie.com/embed/' + YT_ID,
    'youtube.com/watch?v=' + YT_ID,
    'https://youtu.be/' + YT_ID + '/',
    'https://www.youtube.com/embed/' + YT_ID + '/',
    // A repeated v= resolves to the first one, as YouTube itself does.
    'https://www.youtube.com/watch?v=' + YT_ID + '&v=ZZZZZZZZZZZ',
    'HTTPS://WWW.YouTube.com/watch?v=' + YT_ID + '#t=1',
  ].forEach((url) => {
    it('encodes YouTube shape ' + url, () => {
      const ref = encodeVideoRef(url);
      assert.strictEqual(ref, encodeVideoRef(YT_WATCH));
      assert.match(ref, /^r2[A-Za-z0-9_-]+$/);
      assert.ok(!ref.includes(YT_ID));
      assert.deepStrictEqual(decodeVideoSource(ref), { provider: 'yt', id: YT_ID, watchUrl: YT_WATCH });
      assert.strictEqual(decodeVideoRef(ref), YT_WATCH);
    });
  });

  [
    GD_VIEW,
    GD_VIEW + '?usp=sharing',
    'https://drive.google.com/file/d/' + GD_ID,
    'https://drive.google.com/open?id=' + GD_ID,
    'https://drive.google.com/open?usp=sharing&id=' + GD_ID,
  ].forEach((url) => {
    it('encodes Drive shape ' + url, () => {
      const ref = encodeVideoRef(url);
      assert.strictEqual(ref, encodeVideoRef(GD_VIEW));
      assert.match(ref, /^r2[A-Za-z0-9_-]+$/);
      assert.ok(!ref.includes(GD_ID));
      assert.deepStrictEqual(decodeVideoSource(ref), { provider: 'gd', id: GD_ID, watchUrl: GD_VIEW });
    });
  });

  [
    'xx:' + YT_ID,
    'yt:short',
    'yt:' + YT_ID + 'x',
    'yt:' + YT_ID.slice(0, -1) + ';',
    'gd:tooshort',
    'gd:' + GD_ID.slice(0, -1) + '/',
    YT_ID,
    'vimeo:' + YT_ID,
  ].forEach((payload) => {
    it('rejects bad r2 payload ' + payload, () => {
      assert.throws(() => decodeVideoSource(rawRef('r2', payload)));
      assert.throws(() => decodeVideoRef(rawRef('r2', payload)));
    });
  });

  [
    'https://example.com/x',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=' + YT_ID + 'x',
    'https://www.youtube.com/watch?list=' + YT_ID,
    'https://evil.com/?u=https://youtu.be/' + YT_ID,
    'https://drive.google.com/file/d/tooshort/view',
    'https://drive.google.com/drive/folders/' + GD_ID,
    '',
  ].forEach((url) => {
    it('rejects unsupported url ' + JSON.stringify(url), () => {
      assert.throws(() => encodeVideoRef(url), /not a supported video url/);
    });
  });

  it('rejects an unknown version', () => {
    assert.throws(() => decodeVideoSource('r9zzzz'));
  });
});

// Synthetic ids only — never a real library or video id.
const BN_LIB = '123456';
const BN_GUID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const BN_ID = BN_LIB + '/' + BN_GUID;
const BN_PLAY = 'https://player.mediadelivery.net/play/' + BN_ID;

describe('vimeo_codec — r2 Bunny Stream refs', () => {
  [
    BN_PLAY,
    'https://player.mediadelivery.net/embed/' + BN_ID,
    'https://player.mediadelivery.net/embed/' + BN_ID + '?autoplay=false&preload=false&lang=en',
    'https://player.mediadelivery.net/play/' + BN_ID + '?autoplay=false&lang=en&t=113',
    'https://iframe.mediadelivery.net/embed/' + BN_ID,
    'https://player.mediadelivery.net/play/' + BN_ID + '/',
    'http://player.mediadelivery.net/play/' + BN_ID + '#t=1',
    'player.mediadelivery.net/play/' + BN_ID,
    'HTTPS://Player.MediaDelivery.net/PLAY/' + BN_LIB + '/' + BN_GUID.toUpperCase(),
  ].forEach((url) => {
    it('encodes Bunny shape ' + url, () => {
      const ref = encodeVideoRef(url);
      assert.strictEqual(ref, encodeVideoRef(BN_PLAY));
      assert.match(ref, /^r2[A-Za-z0-9_-]+$/);
      assert.ok(!ref.includes(BN_LIB) && !ref.includes(BN_GUID));
      assert.deepStrictEqual(decodeVideoSource(ref), { provider: 'bn', id: BN_ID, watchUrl: BN_PLAY });
      assert.strictEqual(decodeVideoRef(ref), BN_PLAY);
    });
  });

  [
    'bn:' + BN_LIB,
    'bn:' + BN_GUID,
    'bn:abc/' + BN_GUID,
    'bn:' + BN_LIB + '/' + BN_GUID.slice(0, -1),
    'bn:' + BN_LIB + '/' + BN_GUID.toUpperCase(),
    'bn:' + BN_ID + ';',
    'bn:' + BN_ID + '/x',
    'bn:1234567890123/' + BN_GUID,
  ].forEach((payload) => {
    it('rejects bad Bunny payload ' + payload, () => {
      assert.throws(() => decodeVideoSource(rawRef('r2', payload)));
    });
  });

  [
    'https://player.mediadelivery.net/embed/' + BN_LIB,
    'https://player.mediadelivery.net/embed/' + BN_GUID,
    'https://player.mediadelivery.net/watch/' + BN_ID,
    'https://player.mediadelivery.net/embed/abc/' + BN_GUID,
    'https://player.mediadelivery.net.evil.com/embed/' + BN_ID,
    'https://evil.com/?u=https://player.mediadelivery.net/embed/' + BN_ID,
    'https://player.mediadelivery.net/embed/' + BN_ID + '0',
  ].forEach((url) => {
    it('rejects unsupported Bunny url ' + url, () => {
      assert.throws(() => encodeVideoRef(url), /not a supported video url/);
    });
  });
});
