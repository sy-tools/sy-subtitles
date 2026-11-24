const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  parseAddTalkHash,
  buildMetaYaml,
  defaultSyncRoles,
  syncRolesForRows,
  syncRolesAcceptable,
  addTalkPrBody,
  videoFromPayload,
  rowMediaUrls,
  isSupportedVideoUrl,
  buildMetaYamlChecked,
} = require('../site/js/add_talk_data');
const { decodeVideoRef, decodeVideoSource } = require('../site/js/vimeo_codec');

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
        url: 'https://vimeo.com/555555555/eeeeeeeeee',
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

// --- sync roles -------------------------------------------------------------
// A multi-video talk that declares no `sync:` cannot be synced or built at all
// (tools/video_roles.py refuses to guess), so the add-talk form is where the
// declaration has to be made.

describe('defaultSyncRoles — the form default', () => {
  it('leaves a single video undeclared: there is nothing to disambiguate', () => {
    assert.deepStrictEqual(defaultSyncRoles([{ slug: 'Only-Video' }]), []);
    assert.deepStrictEqual(defaultSyncRoles([]), []);
  });

  it('makes the recording primary and the Talk cut derived', () => {
    assert.deepStrictEqual(
      defaultSyncRoles([{ slug: 'Guru-Puja' }, { slug: 'Guru-Puja-Talk-Gravity' }]),
      ['primary', 'derived'],
    );
  });

  it('does not make a Talk cut primary just because it is listed first', () => {
    assert.deepStrictEqual(
      defaultSyncRoles([{ slug: 'Ganesha-Puja-Talk' }, { slug: 'Ganesha-Puja' }]),
      ['derived', 'primary'],
    );
  });

  it('marks every video after the primary derived', () => {
    assert.deepStrictEqual(
      defaultSyncRoles([{ slug: 'Puja' }, { slug: 'Puja-Talk' }, { slug: 'Cam-2' }]),
      ['primary', 'derived', 'derived'],
    );
  });

  it('still yields exactly one primary when every video looks like a Talk cut', () => {
    assert.deepStrictEqual(
      defaultSyncRoles([{ slug: 'A-Talk' }, { slug: 'B-Talk' }]),
      ['primary', 'derived'],
    );
  });

  it('does not treat "Talk" inside a word as a Talk cut', () => {
    assert.deepStrictEqual(
      defaultSyncRoles([{ slug: 'Talking-To-Yogis' }, { slug: 'Something-Else' }]),
      ['primary', 'derived'],
    );
  });
});

describe('buildMetaYaml — sync roles', () => {
  it('serialises sync per video', () => {
    const yaml = buildMetaYaml({
      title: 'T',
      date: '1992-07-19',
      language: 'en',
      videos: [
        { slug: 'Guru-Puja', title: 'Guru Puja', sync: 'primary' },
        { slug: 'Guru-Puja-Talk', title: 'Guru Puja Talk', sync: 'derived' },
      ],
    });
    assert.ok(yaml.includes("- slug: Guru-Puja\n  title: 'Guru Puja'\n  sync: primary\n"));
    assert.ok(yaml.includes('  sync: derived\n'));
  });

  it('omits sync when there is nothing to declare', () => {
    const yaml = buildMetaYaml({
      title: 'T',
      date: '1992-07-19',
      language: 'en',
      videos: [{ slug: 'Only-Video', title: 'Only Video' }],
    });
    assert.ok(!yaml.includes('sync:'));
  });
});

// The form seeds roles from one list of rows and emits meta.yaml from another:
// every row versus only the rows an editor filled in. A blank row between them
// takes the `primary` slot and is then dropped, leaving a meta.yaml that
// tools/video_roles.py refuses outright — the talk can be neither synced nor
// built, which is the exact failure the role control exists to prevent.
describe('syncRolesForRows — roles follow the rows that are actually emitted', () => {
  it('does not let a blank row absorb the primary role', () => {
    const roles = syncRolesForRows([
      { title: '', url: '' },
      { title: 'Guru Puja', url: 'https://vimeo.com/1' },
      { title: 'Guru Puja Talk', url: 'https://vimeo.com/2' },
    ]);
    assert.strictEqual(roles[0], null, 'a blank row declares nothing');
    assert.deepStrictEqual(roles.slice(1), ['primary', 'derived']);
  });

  // The corpus names its Talk cuts «Guru Puja Talk: Creativity» — 23 of the
  // 175 video titles in talks/*/meta.yaml put punctuation right after «Talk».
  // The row's name has to be built the way the preview builds it, or the Talk
  // cut is not recognised as one and becomes the default primary.
  it('recognises a Talk cut whose title punctuates straight after «Talk»', () => {
    const roles = syncRolesForRows([
      { title: 'Guru Puja Talk: Creativity', url: 'https://vimeo.com/1' },
      { title: 'Guru Puja', url: 'https://vimeo.com/2' },
    ]);
    assert.deepStrictEqual(roles, ['derived', 'primary']);
  });

  it('leaves one filled row undeclared however many blanks surround it', () => {
    const roles = syncRolesForRows([
      { title: '', url: '' },
      { title: 'Guru Puja', url: 'https://vimeo.com/1' },
    ]);
    assert.deepStrictEqual(roles, [null, null]);
  });

  it('treats a row with only a url as filled', () => {
    const roles = syncRolesForRows([
      { title: '', url: 'https://vimeo.com/1' },
      { title: 'Guru Puja Talk', url: '' },
    ]);
    assert.deepStrictEqual(roles, ['primary', 'derived']);
  });

  it('always emits exactly one primary when it declares anything', () => {
    const roles = syncRolesForRows([
      { title: 'Puja Talk', url: 'https://vimeo.com/1' },
      { title: '', url: '' },
      { title: 'Second Talk', url: 'https://vimeo.com/2' },
    ]).filter(Boolean);
    assert.strictEqual(roles.filter((r) => r === 'primary').length, 1);
  });
});

describe('addTalkPrBody', () => {
  const INDEX = 'https://sy-tools.github.io/sy-subtitles/';

  it('includes the source url and the talk_id in a fenced block', () => {
    const body = addTalkPrBody('https://www.amruta.org/x', '1981-11-01_Diwali', INDEX);
    assert.ok(body.includes('Added via SY Subtitles SPA from: https://www.amruta.org/x'));
    assert.ok(body.includes('Talk ID:\n```\n1981-11-01_Diwali\n```'));
  });

  it('links the index searched to this talk, across every status', () => {
    const body = addTalkPrBody('https://www.amruta.org/x', '1981-11-01_Diwali', INDEX);
    assert.ok(body.includes('(' + INDEX + '?q=1981-11-01_Diwali&f=all)'), body);
  });
});

// --- YouTube + Google Drive mirrors ------------------------------------------
// amruta.org moved its talks from Vimeo to YouTube, each with Google Drive MP4
// mirrors. The bookmarklet hands a YouTube video over as {p:'yt', id, gd, l};
// meta.yaml stores the YouTube link as video_ref and the mirrors as media_refs.
// Every id here is synthetic.

const YT_ID = 'AbCdEfGhIjK';
const YT_URL = 'https://www.youtube.com/watch?v=' + YT_ID;
const GD_IDS = ['1Syntheticdriveid00abcdefghijklmn', '1Syntheticdriveid01abcdefghijklmn'];
const GD_URLS = GD_IDS.map((id) => 'https://drive.google.com/file/d/' + id + '/view');

// The media_refs block list under the video whose slug is given.
function mediaRefsOf(yaml, slug) {
  const block = yaml.split(/^- slug: /m).find((b) => b.startsWith(slug + '\n')) || '';
  const m = block.match(/^ {2}media_refs:\n((?: {2}- \S+\n)+)/m);
  return m ? m[1].trim().split('\n').map((l) => l.replace(/^\s*- /, '')) : null;
}

describe('videoFromPayload — bookmarklet video → form row', () => {
  it('turns a YouTube video into its watch URL plus the Drive mirrors', () => {
    assert.deepStrictEqual(
      videoFromPayload({ p: 'yt', id: YT_ID, gd: GD_IDS, l: 'Bhoomi Devi Puja Talk' }),
      { url: YT_URL, title: 'Bhoomi Devi Puja Talk', mediaUrls: GD_URLS }
    );
  });

  it('gives a YouTube video with no mirrors an empty list', () => {
    assert.deepStrictEqual(videoFromPayload({ p: 'yt', id: YT_ID, l: 'T' }), {
      url: YT_URL, title: 'T', mediaUrls: [],
    });
  });

  it('keeps a Vimeo video exactly as before', () => {
    assert.deepStrictEqual(videoFromPayload({ id: '123456', h: 'abcd', l: 'Talk' }), {
      url: 'https://vimeo.com/123456/abcd', title: 'Talk', mediaUrls: [],
    });
  });

  it('keeps the legacy bare-id string payload', () => {
    assert.deepStrictEqual(videoFromPayload('123456'), {
      url: 'https://vimeo.com/123456', title: '', mediaUrls: [],
    });
  });

  it('gives a video whose link could not be found a row with no URL', () => {
    // What the bookmarklet emits for a wrapper it found no id in.
    assert.deepStrictEqual(videoFromPayload({ id: '', h: '', l: 'Mystery' }), {
      url: '', title: 'Mystery', mediaUrls: [],
    });
    assert.deepStrictEqual(videoFromPayload({ p: 'yt', id: '', gd: GD_IDS, l: 'Mystery' }), {
      url: '', title: 'Mystery', mediaUrls: [],
    });
  });
});

describe('rowMediaUrls — mirrors belong to the link they came with', () => {
  it('keeps the mirrors while the row still carries the scraped link', () => {
    assert.deepStrictEqual(rowMediaUrls(' ' + YT_URL + ' ', YT_URL, GD_URLS), GD_URLS);
  });

  it('drops them once the editor types a different link', () => {
    assert.deepStrictEqual(rowMediaUrls('https://youtu.be/ZyXwVuTsRqP', YT_URL, GD_URLS), []);
  });

  it('gives a manually added row none', () => {
    assert.deepStrictEqual(rowMediaUrls(YT_URL, '', []), []);
    assert.deepStrictEqual(rowMediaUrls(YT_URL, undefined, undefined), []);
    assert.deepStrictEqual(rowMediaUrls('', '', GD_URLS), []);
  });
});

describe('buildMetaYaml — YouTube video_ref and media_refs', () => {
  it('stores a YouTube link as an r2 video_ref and the mirrors as media_refs', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1982-07-12', language: 'en',
      videos: [{ slug: 'A', title: 'A', url: YT_URL, mediaUrls: GD_URLS }],
    });
    const ref = yaml.match(/^ {2}video_ref: (r2[A-Za-z0-9_-]+)$/m);
    assert.ok(ref, 'expected an r2 video_ref line:\n' + yaml);
    assert.deepStrictEqual(decodeVideoSource(ref[1]), { provider: 'yt', id: YT_ID, watchUrl: YT_URL });
    const refs = mediaRefsOf(yaml, 'A');
    assert.ok(refs, 'expected a media_refs block list:\n' + yaml);
    assert.strictEqual(refs.length, 2);
    assert.deepStrictEqual(refs.map((r) => decodeVideoSource(r).provider), ['gd', 'gd']);
    assert.deepStrictEqual(refs.map(decodeVideoRef), GD_URLS);
    // media_refs sits right after video_ref.
    assert.match(yaml, /^ {2}video_ref: \S+\n {2}media_refs:\n {2}- /m);
    // Nothing plaintext reaches the file.
    assert.doesNotMatch(yaml, /youtu|drive\.google|AbCdEfGhIjK|Syntheticdriveid/);
  });

  it('writes no media_refs for a YouTube video without mirrors', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1982-07-12', language: 'en',
      videos: [{ slug: 'A', title: 'A', url: 'https://youtu.be/' + YT_ID }, { slug: 'B', title: 'B', url: YT_URL, mediaUrls: [] }],
    });
    assert.strictEqual((yaml.match(/^ {2}video_ref: r2/gm) || []).length, 2);
    assert.doesNotMatch(yaml, /media_refs/);
  });

  it('never writes media_refs on a Vimeo video or on one with no link', () => {
    // tools/schemas.py allows media_refs only next to a YouTube video_ref.
    const yaml = buildMetaYaml({
      title: 'T', date: '1982-07-12', language: 'en',
      videos: [
        { slug: 'A', title: 'A', url: 'https://vimeo.com/1/2', mediaUrls: GD_URLS },
        { slug: 'B', title: 'B', url: '', mediaUrls: GD_URLS },
      ],
    });
    assert.doesNotMatch(yaml, /media_refs/);
  });

  it('keeps each provider on its own video in a mixed talk', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1982-07-12', language: 'en',
      videos: [
        { slug: 'Puja', title: 'Puja', url: 'https://vimeo.com/123456/abcd', sync: 'primary' },
        { slug: 'Puja-Talk', title: 'Puja Talk', url: YT_URL, mediaUrls: GD_URLS, sync: 'derived' },
      ],
    });
    const [, vimeo, yt] = yaml.split(/^- slug: /m);
    assert.match(vimeo, /^ {2}video_ref: r1\S+\n {2}sync: primary$/m);
    assert.doesNotMatch(vimeo, /media_refs/);
    assert.match(yt, /^ {2}video_ref: r2\S+\n {2}media_refs:\n {2}- r2\S+\n {2}- r2\S+\n {2}sync: derived$/m);
    assert.strictEqual(mediaRefsOf(yaml, 'Puja'), null);
    assert.deepStrictEqual(mediaRefsOf(yaml, 'Puja-Talk').map(decodeVideoRef), GD_URLS);
  });
});

// tools/download.py's setup_talk writes the same videos from the CLI path. Both
// sides read tests/fixtures/add_talk_meta_parity.json, so the form and the CLI
// cannot come to store the same video differently.
describe('buildMetaYaml — parity with tools.download setup_talk', () => {
  const parity = require('./fixtures/add_talk_meta_parity.json');

  it('emits exactly the refs the shared fixture expects', () => {
    const yaml = buildMetaYaml({
      title: 'T', date: '1982-07-12', language: 'en',
      videos: parity.videos.map((v) => ({
        slug: v.slug, title: v.title, url: v.video_url, mediaUrls: v.media_urls,
      })),
    });
    const blocks = yaml.split(/^- slug: /m).slice(1);
    assert.strictEqual(blocks.length, parity.expected.length);
    parity.expected.forEach((want, i) => {
      const ref = blocks[i].match(/^ {2}video_ref: (\S+)$/m);
      assert.strictEqual(ref ? ref[1] : undefined, want.video_ref, want.slug);
      assert.deepStrictEqual(mediaRefsOf(yaml, want.slug) || undefined, want.media_refs, want.slug);
    });
  });
});

// --- a link that cannot be stored --------------------------------------------
// encodeVideoRef throws on a link it does not know (a YouTube /live/ or
// /shorts/ link, a half-typed one). The form used to let that throw escape its
// input handler: the preview kept the YAML of the PREVIOUS keystroke and
// submit committed it — the old video_ref and media_refs under a row that now
// said something else. buildMetaYamlChecked is what the form calls instead: a
// build either succeeds or yields no YAML at all.

describe('isSupportedVideoUrl', () => {
  it('accepts what the codec can store', () => {
    for (const url of [YT_URL, 'https://youtu.be/' + YT_ID, 'https://vimeo.com/123456/abcd', GD_URLS[0]]) {
      assert.strictEqual(isSupportedVideoUrl(url), true, url);
    }
  });

  it('rejects what it cannot', () => {
    for (const url of [
      'https://www.youtube.com/live/' + YT_ID,
      'https://www.youtube.com/shorts/' + YT_ID,
      'https://youtu.b',
      'https://example.com/video.mp4',
      '',
      null,
    ]) {
      assert.strictEqual(isSupportedVideoUrl(url), false, String(url));
    }
  });
});

describe('buildMetaYamlChecked — a failed build yields no YAML', () => {
  const base = { title: 'T', date: '1982-07-12', language: 'en' };

  it('returns the same YAML as buildMetaYaml when every link encodes', () => {
    const fields = {
      ...base,
      videos: [
        { slug: 'A', title: 'A', url: YT_URL, mediaUrls: GD_URLS, sync: 'primary' },
        { slug: 'B', title: 'B', url: 'https://vimeo.com/1/2', sync: 'derived' },
        { slug: 'C', title: 'C', url: '', sync: 'ignored' },
      ],
    };
    assert.deepStrictEqual(buildMetaYamlChecked(fields), {
      ok: true, yaml: buildMetaYaml(fields), badVideos: [],
    });
    assert.deepStrictEqual(buildMetaYamlChecked(base), {
      ok: true, yaml: buildMetaYaml(base), badVideos: [],
    });
  });

  it('names the video whose link cannot be stored and returns no YAML', () => {
    const res = buildMetaYamlChecked({
      ...base,
      videos: [
        { slug: 'A', title: 'A', url: 'https://vimeo.com/1/2' },
        { slug: 'B', title: 'B', url: 'https://www.youtube.com/live/' + YT_ID, mediaUrls: GD_URLS },
        { slug: 'C', title: 'C', url: 'https://youtu.b' },
      ],
    });
    assert.deepStrictEqual(res, { ok: false, yaml: '', badVideos: [1, 2] });
  });

  it('treats a mirror that cannot be stored as that video\'s failure', () => {
    const res = buildMetaYamlChecked({
      ...base,
      videos: [{ slug: 'A', title: 'A', url: YT_URL, mediaUrls: [GD_URLS[0], 'https://drive.google.com/file/d/short/view'] }],
    });
    assert.deepStrictEqual(res, { ok: false, yaml: '', badVideos: [0] });
  });

  it('does not throw where buildMetaYaml does', () => {
    const fields = { ...base, videos: [{ slug: 'A', title: 'A', url: 'nope' }] };
    assert.throws(() => buildMetaYaml(fields));
    assert.doesNotThrow(() => buildMetaYamlChecked(fields));
  });
});

describe('syncRolesAcceptable — what tools/video_roles.py accepts', () => {
  it('accepts exactly one primary', () => {
    assert.strictEqual(syncRolesAcceptable(['primary', 'derived', 'independent', 'ignored']), true);
  });
  it('accepts a talk of equal parts with no primary', () => {
    assert.strictEqual(syncRolesAcceptable(['independent', 'independent', 'independent', 'independent']), true);
    assert.strictEqual(syncRolesAcceptable(['independent', 'ignored']), true);
  });
  it('refuses two primaries', () => {
    assert.strictEqual(syncRolesAcceptable(['primary', 'primary']), false);
  });
  it('refuses a derived video with no primary to mirror', () => {
    assert.strictEqual(syncRolesAcceptable(['independent', 'derived']), false);
  });
  it('refuses a talk with nothing to build', () => {
    assert.strictEqual(syncRolesAcceptable(['ignored', 'ignored']), false);
  });
  it('accepts a talk that declares nothing (a lone video)', () => {
    assert.strictEqual(syncRolesAcceptable([]), true);
  });
});
