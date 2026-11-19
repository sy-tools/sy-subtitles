const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const {
  META_BATCH_SIZE,
  chunkList,
  metaBatchQuery,
  parseMetaBatch,
  metaShaIndex,
  reuseHydratedMeta,
  applyMetaText,
  hydrateTalkMeta,
} = require('../site/js/meta_batch');

const SHA = 'a'.repeat(40);

function talk(id, extra) {
  return Object.assign({ id: id, title: '', date: '', videos: [], _srtSlugs: [] }, extra || {});
}

// A stand-in for jsyaml.load: the tests hand over JSON text.
const deps = {
  parseYaml: JSON.parse,
  decodeVideoRef: function (ref) {
    if (ref === 'BAD') throw new Error('bad ref');
    return 'https://vimeo.com/' + ref;
  },
  warn: function () {},
};

describe('chunkList', () => {
  it('splits a list into runs of at most the given size, in order', () => {
    assert.deepStrictEqual(chunkList([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });
  it('returns no chunks for an empty list', () => {
    assert.deepStrictEqual(chunkList([], 3), []);
  });
});

describe('META_BATCH_SIZE', () => {
  it('stays within one hundred aliases per query', () => {
    assert.ok(META_BATCH_SIZE >= 1 && META_BATCH_SIZE <= 100);
  });
});

describe('metaBatchQuery', () => {
  const ids = ['1983-07-24_Guru-Puja', '1990-01-01_a_b', '2001-12-25_x'];
  const q = metaBatchQuery('sy-tools', 'sy-subtitles', SHA, ids);

  it('asks for one aliased blob per talk, each alias a valid GraphQL name', () => {
    const aliases = Object.keys(q.aliases);
    assert.strictEqual(aliases.length, ids.length);
    aliases.forEach(function (a) {
      assert.match(a, /^[_A-Za-z][_0-9A-Za-z]*$/);
      assert.ok(q.query.includes(a + ': object(expression: $' + a + ')'), 'alias ' + a + ' is queried');
    });
    assert.deepStrictEqual(aliases.map(function (a) { return q.aliases[a]; }), ids);
  });

  it('never writes a talk id into the query text: every expression is a variable', () => {
    ids.forEach(function (id) {
      assert.ok(!q.query.includes(id), id + ' must not be interpolated into the query');
    });
    assert.strictEqual(q.variables.m0, SHA + ':talks/1983-07-24_Guru-Puja/meta.yaml');
    assert.strictEqual(q.variables.m2, SHA + ':talks/2001-12-25_x/meta.yaml');
  });

  it('passes owner and name as variables and declares every variable it uses', () => {
    assert.strictEqual(q.variables.owner, 'sy-tools');
    assert.strictEqual(q.variables.name, 'sy-subtitles');
    Object.keys(q.variables).forEach(function (v) {
      assert.ok(q.query.includes('$' + v + ': String!'), '$' + v + ' is declared');
    });
    assert.ok(q.query.includes('repository(owner: $owner, name: $name)'));
  });

  it('reads the blob text, and whether it was cut short', () => {
    assert.match(q.query, /\.\.\. on Blob \{[^}]*\btext\b[^}]*\}/);
    assert.match(q.query, /\.\.\. on Blob \{[^}]*\bisTruncated\b[^}]*\}/);
  });

  it('keeps a hostile id inert: it travels as a JSON variable only', () => {
    const evil = 'x"){text}} evil: __schema{types{name';
    const h = metaBatchQuery('o', 'n', 'main', [evil]);
    assert.ok(!h.query.includes('evil'));
    assert.strictEqual(h.variables.m0, 'main:talks/' + evil + '/meta.yaml');
  });
});

describe('parseMetaBatch', () => {
  const aliases = { m0: 'a', m1: 'b', m2: 'c', m3: 'd', m4: 'e' };

  it('maps each alias back to its talk id', () => {
    const out = parseMetaBatch({ data: { repository: { m0: { text: 'title: A' }, m1: { text: 'title: B' } } } },
      { m0: 'a', m1: 'b' });
    assert.deepStrictEqual(out, { a: 'title: A', b: 'title: B' });
  });

  it('answers null for a missing blob, a non-blob and a binary blob', () => {
    const out = parseMetaBatch({ data: { repository: {
      m0: null, m1: {}, m2: { text: null, isTruncated: false }, m3: { text: 'ok', isTruncated: false },
      m4: { text: '', isTruncated: false },
    } } }, aliases);
    assert.deepStrictEqual(out, { a: null, b: null, c: null, d: 'ok', e: '' });
  });

  it('leaves a truncated blob unanswered, so the caller reads it another way', () => {
    const out = parseMetaBatch({ data: { repository: { m0: { text: 'half', isTruncated: true } } } }, { m0: 'a' });
    assert.deepStrictEqual(out, {});
  });

  it('throws when the reply carries no repository', () => {
    assert.throws(function () { parseMetaBatch({ data: { repository: null } }, aliases); });
    assert.throws(function () { parseMetaBatch({}, aliases); });
    assert.throws(function () { parseMetaBatch(null, aliases); });
  });

  it('throws when the reply carries errors, even beside partial data', () => {
    assert.throws(function () {
      parseMetaBatch({ errors: [{ message: 'rate limited' }], data: { repository: { m0: { text: 'x' } } } }, aliases);
    }, /rate limited/);
  });
});

describe('metaShaIndex', () => {
  it('collects the blob sha of every talk meta.yaml and nothing else', () => {
    const idx = metaShaIndex([
      { path: 'talks/a/meta.yaml', sha: 's1' },
      { path: 'talks/b/meta.yaml', sha: 's2' },
      { path: 'talks/b/video/meta.yaml', sha: 'no' },
      { path: 'talks/a/transcript_en.txt', sha: 'no' },
      { path: 'meta.yaml', sha: 'no' },
    ]);
    assert.deepStrictEqual(idx, { a: 's1', b: 's2' });
  });
});

describe('reuseHydratedMeta', () => {
  const cached = [
    talk('same', { title: 'Same', date: '1990-01-01', amrutaUrl: 'https://a', _metaSha: 's1',
      videos: [{ slug: 'v', title: 'V', vimeo_url: 'u', sync: '', hasSrt: true }] }),
    talk('changed', { title: 'Old title', date: '1991-01-01', _metaSha: 'old' }),
    talk('failed', { title: '', _metaSha: 's3' }),
    talk('legacy', { title: 'Legacy' }),
  ];

  it('keeps the hydrated fields of a talk whose meta.yaml sha did not change', () => {
    const talks = [talk('same')];
    const n = reuseHydratedMeta(talks, cached, { same: 's1' });
    assert.strictEqual(n, 1);
    assert.strictEqual(talks[0].title, 'Same');
    assert.strictEqual(talks[0].date, '1990-01-01');
    assert.strictEqual(talks[0].amrutaUrl, 'https://a');
    assert.deepStrictEqual(talks[0].videos, cached[0].videos);
    assert.notStrictEqual(talks[0].videos[0], cached[0].videos[0], 'videos are copied, not shared');
  });

  it('leaves a talk untitled when its sha changed, was never hydrated, or was never recorded', () => {
    const talks = [talk('changed'), talk('failed'), talk('legacy'), talk('brand-new')];
    const n = reuseHydratedMeta(talks, cached, { changed: 'new', failed: 's3', legacy: 's4', 'brand-new': 's5' });
    assert.strictEqual(n, 0);
    talks.forEach(function (t) { assert.strictEqual(t.title, '', t.id); });
  });

  it('stamps every talk with its current meta sha, reused or not', () => {
    const talks = [talk('same'), talk('changed'), talk('unknown')];
    reuseHydratedMeta(talks, cached, { same: 's1', changed: 'new' });
    assert.deepStrictEqual(talks.map(function (t) { return t._metaSha; }), ['s1', 'new', '']);
  });

  it('never reuses on an empty sha', () => {
    const talks = [talk('x')];
    reuseHydratedMeta(talks, [talk('x', { title: 'X', _metaSha: '' })], {});
    assert.strictEqual(talks[0].title, '');
  });

  it('works with no cache at all', () => {
    const talks = [talk('x')];
    assert.strictEqual(reuseHydratedMeta(talks, null, { x: 's' }), 0);
    assert.strictEqual(talks[0]._metaSha, 's');
  });
});

describe('applyMetaText', () => {
  it('fills title, date, amruta url and videos, decoding video_ref', () => {
    const t = talk('1990-01-01_x', { _srtSlugs: ['v1'] });
    const ok = applyMetaText(t, JSON.stringify({
      title: 'T', date: 19900101, amruta_url: 'https://amruta',
      videos: [{ slug: 'v1', title: 'One', video_ref: 'REF', sync: 'ignored' }, { slug: 'v2' }],
    }), deps);
    assert.strictEqual(ok, true);
    assert.strictEqual(t.title, 'T');
    assert.strictEqual(t.date, '19900101');
    assert.strictEqual(t.amrutaUrl, 'https://amruta');
    assert.deepStrictEqual(t.videos, [
      { slug: 'v1', title: 'One', vimeo_url: 'https://vimeo.com/REF', sync: 'ignored', hasSrt: true },
      { slug: 'v2', title: 'v2', vimeo_url: '', sync: '', hasSrt: false },
    ]);
  });

  it('falls back to the id for the title and to its date prefix for the date', () => {
    const t = talk('1990-01-01_x');
    applyMetaText(t, '{}', deps);
    assert.strictEqual(t.title, '1990-01-01_x');
    assert.strictEqual(t.date, '1990-01-01');
    assert.strictEqual(t.amrutaUrl, '');
    assert.deepStrictEqual(t.videos, []);
  });

  it('keeps the video when its video_ref does not decode', () => {
    const t = talk('x');
    applyMetaText(t, JSON.stringify({ title: 'T', videos: [{ slug: 'v', video_ref: 'BAD' }] }), deps);
    assert.strictEqual(t.videos[0].vimeo_url, '');
  });

  it('leaves the talk untouched on empty text', () => {
    const t = talk('x');
    assert.strictEqual(applyMetaText(t, '', deps), false);
    assert.strictEqual(applyMetaText(t, null, deps), false);
    assert.strictEqual(t.title, '');
  });

  it('warns and leaves the talk untitled on unparseable text', () => {
    const t = talk('x');
    const warned = [];
    const ok = applyMetaText(t, '{nope', Object.assign({}, deps, { warn: function (m) { warned.push(m); } }));
    assert.strictEqual(ok, false);
    assert.strictEqual(t.title, '');
    assert.strictEqual(warned.length, 1);
  });
});

describe('hydrateTalkMeta', () => {
  function env(over) {
    const calls = { graphql: [], raw: [], unauthorized: 0 };
    const opts = Object.assign({
      token: 'tok', owner: 'o', name: 'n', ref: SHA, batchSize: 2,
      graphql: function (token, query, variables) {
        calls.graphql.push({ token: token, query: query, variables: variables });
        const repo = {};
        Object.keys(variables).forEach(function (k) {
          if (/^m\d+$/.test(k)) {
            const id = variables[k].replace(/^.*:talks\//, '').replace(/\/meta\.yaml$/, '');
            repo[k] = { text: JSON.stringify({ title: 'G-' + id }), isTruncated: false };
          }
        });
        return Promise.resolve({ data: { repository: repo } });
      },
      fetchRaw: function (t) {
        calls.raw.push(t.id);
        return Promise.resolve(JSON.stringify({ title: 'R-' + t.id }));
      },
      apply: function (t, text) { return applyMetaText(t, text, deps); },
      onUnauthorized: function () { calls.unauthorized++; },
      warn: function () {},
    }, over || {});
    return { calls: calls, opts: opts };
  }

  it('signed in: reads every untitled talk through chunked GraphQL, no raw fetch', async () => {
    const e = env();
    const talks = [talk('a'), talk('b'), talk('c', { title: 'kept' }), talk('d')];
    await hydrateTalkMeta(talks, e.opts);
    assert.strictEqual(e.calls.graphql.length, 2, 'three untitled talks at two per query');
    assert.deepStrictEqual(e.calls.raw, []);
    assert.deepStrictEqual(talks.map(function (t) { return t.title; }), ['G-a', 'G-b', 'kept', 'G-d']);
    e.calls.graphql.forEach(function (c) { assert.strictEqual(c.token, 'tok'); });
    assert.strictEqual(e.calls.graphql[0].variables.m0, SHA + ':talks/a/meta.yaml');
  });

  it('anonymous: goes straight to the raw path and never calls GraphQL', async () => {
    const e = env({ token: null });
    const talks = [talk('a'), talk('b')];
    await hydrateTalkMeta(talks, e.opts);
    assert.strictEqual(e.calls.graphql.length, 0);
    assert.deepStrictEqual(e.calls.raw, ['a', 'b']);
    assert.deepStrictEqual(talks.map(function (t) { return t.title; }), ['R-a', 'R-b']);
  });

  it('does nothing at all when every talk is already titled', async () => {
    const e = env();
    await hydrateTalkMeta([talk('a', { title: 'A' })], e.opts);
    assert.strictEqual(e.calls.graphql.length, 0);
    assert.deepStrictEqual(e.calls.raw, []);
  });

  it('a failed chunk falls back to raw for its own talks only', async () => {
    let n = 0;
    const base = env();
    const e = env({
      graphql: function (token, query, variables) {
        return ++n === 1 ? Promise.reject(new Error('HTTP 502')) : base.opts.graphql(token, query, variables);
      },
    });
    const talks = [talk('a'), talk('b'), talk('c')];
    await hydrateTalkMeta(talks, e.opts);
    assert.deepStrictEqual(e.calls.raw.sort(), ['a', 'b']);
    assert.deepStrictEqual(talks.map(function (t) { return t.title; }), ['R-a', 'R-b', 'G-c']);
    assert.strictEqual(e.calls.unauthorized, 0);
  });

  it('an errors array in the reply falls back to raw', async () => {
    const e = env({
      graphql: function () { return Promise.resolve({ errors: [{ message: 'API rate limit exceeded' }] }); },
    });
    const talks = [talk('a')];
    await hydrateTalkMeta(talks, e.opts);
    assert.deepStrictEqual(e.calls.raw, ['a']);
    assert.strictEqual(talks[0].title, 'R-a');
  });

  it('a synchronous throw from the transport still falls back to raw', async () => {
    const e = env({ graphql: function () { throw new Error('boom'); } });
    const talks = [talk('a')];
    await hydrateTalkMeta(talks, e.opts);
    assert.strictEqual(talks[0].title, 'R-a');
  });

  it('a 401 reports the dead token once, however many chunks fail, then falls back', async () => {
    const e = env({
      graphql: function () { const err = new Error('Bad credentials'); err.status = 401; return Promise.reject(err); },
    });
    const talks = [talk('a'), talk('b'), talk('c')];
    await hydrateTalkMeta(talks, e.opts);
    assert.strictEqual(e.calls.unauthorized, 1);
    assert.deepStrictEqual(e.calls.raw.sort(), ['a', 'b', 'c']);
    assert.deepStrictEqual(talks.map(function (t) { return t.title; }), ['R-a', 'R-b', 'R-c']);
  });

  it('a blob GitHub says is missing is not asked for again over raw', async () => {
    const e = env({
      graphql: function () { return Promise.resolve({ data: { repository: { m0: null, m1: { text: '{"title":"B"}' } } } }); },
    });
    const talks = [talk('a'), talk('b')];
    await hydrateTalkMeta(talks, e.opts);
    assert.deepStrictEqual(e.calls.raw, []);
    assert.deepStrictEqual(talks.map(function (t) { return t.title; }), ['', 'B']);
  });

  it('a truncated blob is read over raw instead', async () => {
    const e = env({
      graphql: function () { return Promise.resolve({ data: { repository: { m0: { text: 'half', isTruncated: true } } } }); },
    });
    const talks = [talk('a')];
    await hydrateTalkMeta(talks, e.opts);
    assert.deepStrictEqual(e.calls.raw, ['a']);
    assert.strictEqual(talks[0].title, 'R-a');
  });

  it('one talk failing over raw does not reject the whole hydration', async () => {
    const e = env({
      token: null,
      fetchRaw: function (t) {
        return t.id === 'a' ? Promise.reject(new Error('offline')) : Promise.resolve('{"title":"B"}');
      },
    });
    const talks = [talk('a'), talk('b')];
    await hydrateTalkMeta(talks, e.opts);
    assert.deepStrictEqual(talks.map(function (t) { return t.title; }), ['', 'B']);
  });
});

describe('meta batch wiring', () => {
  const html = fs.readFileSync('site/index.html', 'utf8');
  const sw = fs.readFileSync('site/sw.js', 'utf8');

  function fnBody(name) {
    const at = html.indexOf('function ' + name + '(');
    assert.ok(at > -1, name + ' exists');
    return html.slice(at, html.indexOf('\nfunction ', at + 10));
  }

  it('index.html loads the module as a plain script tag', () => {
    assert.ok(html.includes('<script src="js/meta_batch.js"></script>'), 'single source, no inline copy');
  });

  it('the service worker precaches the module', () => {
    assert.ok(sw.includes("'js/meta_batch.js'"));
  });

  it('hydrateManifestMeta delegates to the module and keeps no YAML mapping of its own', () => {
    assert.ok(fnBody('hydrateManifestMeta').includes('hydrateTalkMeta('), 'both paths share one driver');
    assert.ok(!html.includes('meta.amruta_url'), 'field extraction lives in applyMetaText only');
  });

  it('the token goes to the GraphQL transport only, never to the raw fetch', () => {
    const body = fnBody('hydrateManifestMeta');
    const raw = body.slice(body.indexOf('fetchRaw:'), body.indexOf('apply:'));
    assert.ok(raw.includes('fetch('), 'the raw path fetches');
    assert.ok(!/Authorization|token|headers/i.test(raw), 'the raw fetch carries no credentials');
    assert.ok(body.includes('ghGraphql('), 'GraphQL goes through the shared api.github.com helper');
  });

  it('a fresh tree reuses hydrated meta by blob sha before fetching anything', () => {
    assert.ok(fnBody('loadManifest')
      .includes('reuseHydratedMeta(m.talks, cache && cache.talks, metaShaIndex(data.tree))'));
  });

  it('a dead token found while hydrating is handled the way loadManifest handles it', () => {
    const body = fnBody('hydrateManifestMeta');
    const un = body.slice(body.indexOf('onUnauthorized:'));
    assert.ok(un.includes('clearAuth()') && un.includes('updateAuthUI()') && un.includes("t('auth.expired')"));
  });
});
