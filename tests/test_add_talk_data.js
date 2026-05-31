const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseAddTalkHash, buildMetaYaml } = require('../site/js/add_talk_data');
const { decodeVideoRef } = require('../site/js/vimeo_codec');

// The bookmarklet encodes its payload exactly like this, then opens the SPA
// at `<base>#/add?data=<encoded>`. These helpers reproduce that round trip so
// the tests exercise the real encode → URL → decode path.
function encodePayload(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}
function hashFor(obj) {
  return '#/add?data=' + encodePayload(obj);
}

const validTalk = {
  t: 'Knots on the Three Channels',
  d: '1978-10-02',
  u: 'https://www.amruta.org/1978/10/02/knots-on-the-three-channels-caxton-hall-1978/',
  loc: 'Caxton Hall',
  v: [{ id: '123456', h: 'abcd', l: 'Talk' }],
  tx: 'Some transcript text.',
};

describe('parseAddTalkHash — routing states', () => {
  it('returns setup when there is no query string', () => {
    assert.deepStrictEqual(parseAddTalkHash('#/add'), { state: 'setup', data: null });
  });

  it('returns setup when query string lacks a data param', () => {
    assert.deepStrictEqual(parseAddTalkHash('#/add?foo=1'), { state: 'setup', data: null });
  });

  it('returns form with parsed data for a valid amruta payload', () => {
    const res = parseAddTalkHash(hashFor(validTalk));
    assert.strictEqual(res.state, 'form');
    assert.deepStrictEqual(res.data, validTalk);
  });

  it('returns wrong_site when the url is not amruta.org', () => {
    const res = parseAddTalkHash(hashFor({ ...validTalk, u: 'https://example.com/x' }));
    assert.strictEqual(res.state, 'wrong_site');
  });

  it('returns wrong_site when the url is missing', () => {
    const { u, ...noUrl } = validTalk;
    const res = parseAddTalkHash(hashFor(noUrl));
    assert.strictEqual(res.state, 'wrong_site');
  });

  it('returns parse_error on a corrupted (non-JSON) data param', () => {
    const res = parseAddTalkHash('#/add?data=' + encodeURIComponent('{not-json'));
    assert.strictEqual(res.state, 'parse_error');
  });
});

// A payload's url must be an actual amruta.org host, not merely contain the
// string "amruta.org" somewhere — otherwise http://evil.com/#amruta.org or
// amruta.org.attacker.com would pass (CodeQL js/incomplete-url-substring).
describe('parseAddTalkHash — amruta host validation (not substring)', () => {
  const stateFor = (u) => parseAddTalkHash(hashFor({ ...validTalk, u })).state;
  it('accepts the bare amruta.org host', () => {
    assert.strictEqual(stateFor('https://amruta.org/1978/10/02/x/'), 'form');
  });
  it('accepts the www.amruta.org host', () => {
    assert.strictEqual(stateFor('https://www.amruta.org/1978/10/02/x/'), 'form');
  });
  it('rejects a host that only contains amruta.org in the path or fragment', () => {
    assert.strictEqual(stateFor('http://attacker.com/#amruta.org'), 'wrong_site');
  });
  it('rejects a look-alike host suffixed with amruta.org', () => {
    assert.strictEqual(stateFor('https://amruta.org.evil.com/x'), 'wrong_site');
  });
  it('rejects an unparseable url', () => {
    assert.strictEqual(stateFor('not a url'), 'wrong_site');
  });
});

// Regression: a literal '%' in the title or transcript (e.g. "100%") used to
// trip a redundant decodeURIComponent on already-decoded text, throwing
// "URI malformed" and surfacing the misleading "Wrong site" error.
describe('parseAddTalkHash — literal percent in content', () => {
  it('parses a title containing a percent sign', () => {
    const obj = { ...validTalk, t: 'You are 100% pure' };
    const res = parseAddTalkHash(hashFor(obj));
    assert.strictEqual(res.state, 'form');
    assert.strictEqual(res.data.t, 'You are 100% pure');
  });

  it('parses a transcript containing percent and ampersand', () => {
    const obj = { ...validTalk, tx: 'He said 30% of attention & more.' };
    const res = parseAddTalkHash(hashFor(obj));
    assert.strictEqual(res.state, 'form');
    assert.strictEqual(res.data.tx, 'He said 30% of attention & more.');
  });

  it('preserves a hash/pound sign in content', () => {
    const obj = { ...validTalk, tx: 'Section #1 and 50% done' };
    const res = parseAddTalkHash(hashFor(obj));
    assert.strictEqual(res.state, 'form');
    assert.strictEqual(res.data.tx, 'Section #1 and 50% done');
  });
});

// Regression: the add-talk form emitted free-text scalars (per-video title,
// location) unquoted, so a colon in a video title — e.g. "Guru Puja Talk:
// Gurus Who Belong To The Collective" — produced invalid YAML
// ("mapping values are not allowed here") and broke the new-talk automation
// (sy-tools/sy-subtitles#293). All free-text scalars must be single-quoted
// and '-escaped.
describe('buildMetaYaml — YAML-safe quoting', () => {
  it('quotes a per-video title containing a colon', () => {
    const yaml = buildMetaYaml({
      title: 'Guru Puja',
      date: '1993-07-04',
      language: 'en',
      videos: [{
        slug: 'Guru-Puja-Talk',
        title: 'Guru Puja Talk: Gurus Who Belong To The Collective',
        url: 'https://vimeo.com/189921224/c6fb45a3f2',
      }],
    });
    assert.match(yaml, /^ {2}title: 'Guru Puja Talk: Gurus Who Belong To The Collective'$/m);
  });

  it('quotes the top-level title containing a colon', () => {
    const yaml = buildMetaYaml({ title: 'Guru Puja: Gurus', date: '1993-07-04', language: 'en' });
    assert.match(yaml, /^title: 'Guru Puja: Gurus'$/m);
  });

  it('quotes a location containing a colon', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1993-07-04', language: 'en',
      location: 'Public Program: Royal Albert Hall',
    });
    assert.match(yaml, /^location: 'Public Program: Royal Albert Hall'$/m);
  });

  it('escapes single quotes by doubling them', () => {
    const yaml = buildMetaYaml({ title: "Mother's love", date: '1993-07-04', language: 'en' });
    assert.match(yaml, /^title: 'Mother''s love'$/m);
  });

  it('emits date/language, video block and base64 transcript', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1993-07-04', language: 'en',
      amruta_url: 'https://www.amruta.org/x/',
      videos: [{ slug: 'A', title: 'A', url: 'https://vimeo.com/1/2' }],
      transcriptBase64: 'YWJjZA==',
    });
    assert.match(yaml, /^date: '1993-07-04'$/m);
    assert.match(yaml, /^language: en$/m);
    assert.match(yaml, /^amruta_url: https:\/\/www\.amruta\.org\/x\/$/m);
    assert.match(yaml, /^videos:$/m);
    assert.match(yaml, /^- slug: A$/m);
    // The link is stored obfuscated as video_ref — no plaintext vimeo anywhere.
    assert.doesNotMatch(yaml, /vimeo_url/);
    assert.doesNotMatch(yaml, /vimeo\.com/);
    const refMatch = yaml.match(/^ {2}video_ref: (r1[A-Za-z0-9_-]+)$/m);
    assert.ok(refMatch, 'expected an obfuscated video_ref line');
    assert.strictEqual(decodeVideoRef(refMatch[1]), 'https://vimeo.com/1/2');
    assert.match(yaml, /^transcript_en_base64: \|$/m);
    assert.match(yaml, /^ {2}YWJjZA==$/m);
  });

  it('omits video_ref for a video with no url', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1993-07-04', language: 'en',
      videos: [{ slug: 'A', title: 'A', url: '' }],
    });
    assert.match(yaml, /^- slug: A$/m);
    assert.doesNotMatch(yaml, /video_ref/);
  });

  it('omits optional location/amruta_url/videos/transcript when absent', () => {
    const yaml = buildMetaYaml({ title: 'T', date: '1993-07-04', language: 'en' });
    assert.doesNotMatch(yaml, /^location:/m);
    assert.doesNotMatch(yaml, /^amruta_url:/m);
    assert.doesNotMatch(yaml, /^videos:/m);
    assert.doesNotMatch(yaml, /^transcript_en_base64:/m);
  });
});
