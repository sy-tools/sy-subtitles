const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const A = require('../site/js/help_admin');

const API = 'https://api.github.com/repos/sy-tools/sy-help-staging';

function catalog() {
  return {
    version: 1,
    sections: [
      { id: 'guide', title: { uk: 'Гайд', en: 'Guide' }, order: 'manual', videos: [
        { file: 'a', title: { uk: 'А', en: 'A' } },
        { file: 'b', title: { uk: 'Б', en: 'B' } },
        { file: 'c-2', title: { uk: 'В', en: 'C' } },
      ] },
      { id: 'updates', title: { uk: 'Оновлення', en: 'Updates' }, order: 'chronological', videos: [
        { file: 'u', date: '2026-09-05', notes: { uk: ['x'], en: [] } },
      ] },
    ],
  };
}
const files = (cat, s) => cat.sections[s].videos.map((v) => v.file);

describe('catalog edits', () => {
  it('move a video up and down within its section, and no further than its ends', () => {
    const cat = catalog();
    assert.deepStrictEqual(files(A.moveVideo(cat, 'b', -1), 0), ['b', 'a', 'c-2']);
    assert.deepStrictEqual(files(A.moveVideo(cat, 'b', 1), 0), ['a', 'c-2', 'b']);
    assert.deepStrictEqual(files(A.moveVideo(cat, 'a', -1), 0), ['a', 'b', 'c-2']);
    assert.deepStrictEqual(files(cat, 0), ['a', 'b', 'c-2'], 'the input is left as it was');
  });

  it('move a video to another section, at its end', () => {
    const out = A.moveToSection(catalog(), 'a', 'updates');
    assert.deepStrictEqual(files(out, 0), ['b', 'c-2']);
    assert.deepStrictEqual(files(out, 1), ['u', 'a']);
  });

  it('set a text of a section or a video in one language', () => {
    let cat = A.setText(catalog(), ['guide', null, 'title', 'en'], 'How to');
    assert.strictEqual(cat.sections[0].title.en, 'How to');
    cat = A.setText(cat, ['guide', 'b', 'description', 'uk'], 'Опис');
    assert.deepStrictEqual(cat.sections[0].videos[1].description, { uk: 'Опис' });
    cat = A.setText(cat, ['updates', 'u', 'notes', 'en'], ['Settings menu']);
    assert.deepStrictEqual(cat.sections[1].videos[0].notes, { uk: ['x'], en: ['Settings menu'] });
    cat = A.setText(cat, ['updates', 'u', 'date', null], '2026-09-06');
    assert.strictEqual(cat.sections[1].videos[0].date, '2026-09-06');
  });

  it('add a section, and remove only an empty one', () => {
    let cat = A.addSection(catalog(), { id: 'extra', title: { uk: 'Додатково', en: '' }, order: 'manual' });
    assert.deepStrictEqual(cat.sections.map((s) => s.id), ['guide', 'updates', 'extra']);
    assert.deepStrictEqual(cat.sections[2].videos, []);
    assert.throws(() => A.addSection(cat, { id: 'guide', title: { uk: 'x' }, order: 'manual' }), /guide/);
    assert.throws(() => A.removeSection(cat, 'guide'), /not empty/);
    cat = A.removeSection(cat, 'extra');
    assert.deepStrictEqual(cat.sections.map((s) => s.id), ['guide', 'updates']);
  });

  it('remove a video', () => {
    assert.deepStrictEqual(files(A.removeVideo(catalog(), 'b'), 0), ['a', 'c-2']);
  });
});

describe('validateCatalog', () => {
  it('passes a sound catalog', () => {
    assert.deepStrictEqual(A.validateCatalog(catalog()), []);
  });

  it('flags what the help repository would refuse to publish', () => {
    const moved = A.moveToSection(catalog(), 'a', 'updates');
    assert.match(A.validateCatalog(moved).join('\n'), /'a' has no date/);
    const cleared = A.setText(catalog(), ['updates', 'u', 'date', null], '');
    assert.match(A.validateCatalog(cleared).join('\n'), /'u' has no date/);
    const dup = catalog();
    dup.sections[0].videos.push({ file: 'a' });
    assert.match(A.validateCatalog(dup).join('\n'), /duplicate file 'a'/);
  });
});

describe('file names', () => {
  it('transliterate a Ukrainian title into a lowercase slug', () => {
    assert.strictEqual(A.slugify('Оновлення на 22.11.2026'), 'onovlennia-na-22-11-2026');
    assert.strictEqual(A.slugify('Робота в режимі «Переглянути переклад»'), 'robota-v-rezhymi-perehlianuty-pereklad');
    assert.strictEqual(A.slugify('Як взяти матеріал у роботу'), 'yak-vziaty-material-u-robotu');
    assert.strictEqual(A.slugify('Їжак, Євген, Юлія, щастя'), 'yizhak-yevhen-yuliia-shchastia');
    assert.strictEqual(A.slugify('Login: GitHub'), 'login-github');
    assert.strictEqual(A.slugify('«»!'), 'video');
  });

  it('keep a slug within 48 characters, cut at a word', () => {
    const slug = A.slugify('Дуже довга назва відео, яка ніяк не вміститься в коротке імʼя файлу');
    assert.ok(slug.length <= 48, slug);
    assert.ok(!slug.endsWith('-'), slug);
  });

  it('name a new video after its slug, or the next free version', () => {
    assert.strictEqual(A.nextFile(catalog(), 'd', null), 'd');
    assert.strictEqual(A.nextFile(catalog(), 'a', null), 'a-v2');
  });

  it('never reuse the name of a recording still in the release', () => {
    assert.strictEqual(A.nextFile(catalog(), 'gone', null, ['gone']), 'gone-v2');
  });

  it('give a replacement the next version of the file it replaces', () => {
    assert.strictEqual(A.nextFile(catalog(), 'ignored', 'a'), 'a-v2');
    assert.strictEqual(A.nextFile(catalog(), 'ignored', 'a-v2'), 'a-v3');
    assert.strictEqual(A.nextFile(catalog(), 'ignored', 'update-2026-11-22'), 'update-2026-11-22-v2');
  });
});

function fakeGitHub({ failBlobOnce = false, refExists = false, catalogSha = 'cat-sha', putStatus = 200 } = {}) {
  const calls = [];
  let blobFailed = false;
  let n = 0;
  const reply = (status, body) => Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) });
  const f = (url, init = {}) => {
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, url: url.replace(API, ''), body });
    const path = url.replace(API, '');
    if (path === '/git/ref/heads/main') return reply(200, { object: { sha: 'head' } });
    if (path === '/git/commits/head') return reply(200, { tree: { sha: 'base-tree' } });
    if (path === '/git/blobs') {
      if (failBlobOnce && !blobFailed) { blobFailed = true; return reply(502, { message: 'bad gateway' }); }
      return reply(201, { sha: 'blob' + (n++) });
    }
    if (path === '/git/trees') return reply(201, { sha: 'tree' });
    if (path === '/git/commits') return reply(201, { sha: 'commit' });
    if (path === '/git/refs') return refExists ? reply(422, { message: 'Reference already exists' }) : reply(201, {});
    if (path.startsWith('/git/refs/heads/inbox/')) return reply(200, {});
    if (path.startsWith('/contents/catalog.json') && method === 'GET') {
      return reply(200, { sha: catalogSha, content: Buffer.from(JSON.stringify(catalog())).toString('base64') });
    }
    if (path === '/contents/catalog.json' && method === 'PUT') {
      return putStatus === 200 ? reply(200, { content: { sha: 'new-sha' } }) : reply(putStatus, { message: 'sha does not match' });
    }
    if (path.startsWith('/actions/runs')) return reply(200, f.runs || { workflow_runs: [] });
    return reply(404, { message: 'unexpected ' + method + ' ' + path });
  };
  f.calls = calls;
  return f;
}

const NODE_DEPS = {
  sha256Hex: (buf) => Promise.resolve(crypto.createHash('sha256').update(Buffer.from(buf)).digest('hex')),
  toBase64: (buf) => Promise.resolve(Buffer.from(buf).toString('base64')),
};

function blobOf(size) {
  const bytes = crypto.randomBytes(size);
  return { size, bytes, slice: (a, b) => ({ arrayBuffer: () => Promise.resolve(bytes.subarray(a, b)) }) };
}

describe('catalog load and save', () => {
  it('load the catalog from main with the sha it was read at', async () => {
    const out = await A.loadCatalog(API, 't', fakeGitHub());
    assert.strictEqual(out.sha, 'cat-sha');
    assert.deepStrictEqual(out.catalog, catalog());
  });

  it('save it with that sha and return the new one', async () => {
    const f = fakeGitHub();
    const sha = await A.saveCatalog(API, 't', catalog(), 'cat-sha', 'Edit tutorials', f);
    assert.strictEqual(sha, 'new-sha');
    const put = f.calls.find((c) => c.method === 'PUT');
    assert.strictEqual(put.body.sha, 'cat-sha');
    assert.strictEqual(put.body.branch, 'main');
    assert.deepStrictEqual(JSON.parse(Buffer.from(put.body.content, 'base64').toString()), catalog());
  });

  it('refuse to save a catalog the help repository would not publish', async () => {
    const f = fakeGitHub();
    await assert.rejects(A.saveCatalog(API, 't', A.moveToSection(catalog(), 'a', 'updates'), 'cat-sha', 'm', f),
      (e) => e.code === 'invalid' && /'a' has no date/.test(e.message));
    assert.strictEqual(f.calls.length, 0);
  });

  it('report a catalog changed underneath as stale, never overwrite it', async () => {
    for (const status of [409, 422]) {
      await assert.rejects(A.saveCatalog(API, 't', catalog(), 'old', 'm', fakeGitHub({ putStatus: status })),
        (e) => e.code === 'stale');
    }
  });
});

describe('uploadVideo', () => {
  const entry = { section: 'guide', file: 'd', replaces: null, title: { uk: 'Г', en: '' } };

  it('commit the file as parts to inbox/<file>, creating the branch last', async () => {
    const f = fakeGitHub();
    const progress = [];
    const blob = blobOf(25);
    const sent = await A.uploadVideo(API, 't', blob, entry, (done, total) => progress.push([done, total]), f,
      Object.assign({ partSize: 10 }, NODE_DEPS));
    assert.deepStrictEqual(sent, { branch: 'inbox/d', sha: 'commit' });
    const blobs = f.calls.filter((c) => c.url === '/git/blobs');
    assert.strictEqual(blobs.length, 4, 'three parts and entry.json');
    assert.deepStrictEqual(Buffer.from(blobs[1].body.content, 'base64'), blob.bytes.subarray(10, 20));
    const tree = f.calls.find((c) => c.url === '/git/trees').body;
    assert.strictEqual(tree.base_tree, 'base-tree');
    assert.deepStrictEqual(tree.tree.map((t) => t.path),
      ['inbox/parts/000', 'inbox/parts/001', 'inbox/parts/002', 'inbox/entry.json']);
    const written = JSON.parse(Buffer.from(blobs[3].body.content, 'base64').toString());
    assert.strictEqual(written.size, 25);
    assert.strictEqual(written.file, 'd');
    assert.deepStrictEqual(written.parts.map((p) => p.size), [10, 10, 5]);
    assert.strictEqual(written.parts[2].sha256, crypto.createHash('sha256').update(blob.bytes.subarray(20)).digest('hex'));
    assert.deepStrictEqual(f.calls.find((c) => c.url === '/git/commits' && c.method === 'POST').body.parents, ['head']);
    assert.deepStrictEqual(f.calls[f.calls.length - 1], { method: 'POST', url: '/git/refs', body: { ref: 'refs/heads/inbox/d', sha: 'commit' } });
    assert.deepStrictEqual(progress[progress.length - 1], [25, 25]);
  });

  it('retry a part GitHub failed to take', async () => {
    const f = fakeGitHub({ failBlobOnce: true });
    await A.uploadVideo(API, 't', blobOf(5), entry, () => {}, f, Object.assign({ partSize: 10, retryDelayMs: 0 }, NODE_DEPS));
    assert.strictEqual(f.calls.filter((c) => c.url === '/git/blobs').length, 3);
  });

  it('move an inbox branch left by an earlier try onto the new upload', async () => {
    const f = fakeGitHub({ refExists: true });
    await A.uploadVideo(API, 't', blobOf(5), entry, () => {}, f, Object.assign({ partSize: 10 }, NODE_DEPS));
    const patch = f.calls[f.calls.length - 1];
    assert.deepStrictEqual(patch, { method: 'PATCH', url: '/git/refs/heads/inbox/d', body: { sha: 'commit', force: true } });
  });

  it('refuse a file over 1 GiB before sending anything', async () => {
    const f = fakeGitHub();
    await assert.rejects(A.uploadVideo(API, 't', { size: 1024 * 1024 * 1024 + 1 }, entry, () => {}, f, NODE_DEPS),
      (e) => e.code === 'too-large');
    assert.strictEqual(f.calls.length, 0);
  });

  it('split into 30 MiB parts by default', () => {
    assert.strictEqual(A.PART_SIZE, 30 * 1024 * 1024);
    assert.strictEqual(A.MAX_UPLOAD_BYTES, 1024 * 1024 * 1024);
  });
});

describe('ingestStatus', () => {
  const run = (sha, status, conclusion, url) => ({ head_sha: sha, status, conclusion, html_url: url });

  it('read the state of the run of the commit just uploaded', async () => {
    const f = fakeGitHub();
    const status = () => A.ingestStatus(API, 't', 'inbox/d', 'c1', f);
    assert.deepStrictEqual(await status(), { state: 'queued', url: null });
    f.runs = { workflow_runs: [run('c1', 'in_progress', null, 'u1')] };
    assert.deepStrictEqual(await status(), { state: 'running', url: 'u1' });
    f.runs = { workflow_runs: [run('c1', 'completed', 'success', 'u2')] };
    assert.deepStrictEqual(await status(), { state: 'done', url: 'u2' });
    f.runs = { workflow_runs: [run('c1', 'completed', 'failure', 'u3')] };
    assert.deepStrictEqual(await status(), { state: 'failed', url: 'u3' });
    assert.ok(f.calls[0].url.includes('branch=inbox%2Fd'), f.calls[0].url);
  });

  it('ignore an earlier run on the same branch name', async () => {
    const f = fakeGitHub();
    f.runs = { workflow_runs: [run('old', 'completed', 'failure', 'u0')] };
    assert.deepStrictEqual(await A.ingestStatus(API, 't', 'inbox/d', 'c1', f), { state: 'queued', url: null });
  });
});

describe('rebaseOnIngest', () => {
  it('add the published video to unsaved edits, keeping them', () => {
    const local = A.setText(catalog(), ['guide', 'a', 'title', 'en'], 'Edited');
    const remote = catalog();
    remote.sections[0].videos.push({ file: 'd', title: { uk: 'Г' }, duration: 3 });
    const out = A.rebaseOnIngest(local, remote, 'd');
    assert.deepStrictEqual(files(out, 0), ['a', 'b', 'c-2', 'd']);
    assert.strictEqual(out.sections[0].videos[0].title.en, 'Edited');
  });

  it('put a replacement in place of the old file, keeping the texts edited meanwhile', () => {
    const local = A.setText(catalog(), ['guide', 'b', 'title', 'en'], 'Edited');
    const remote = catalog();
    remote.sections[0].videos[1] = { file: 'b-v2', title: { uk: 'Б', en: 'B' }, duration: 9 };
    const out = A.rebaseOnIngest(local, remote, 'b-v2');
    assert.deepStrictEqual(files(out, 0), ['a', 'b-v2', 'c-2']);
    assert.deepStrictEqual(out.sections[0].videos[1], { file: 'b-v2', title: { uk: 'Б', en: 'Edited' }, duration: 9 });
  });
});
