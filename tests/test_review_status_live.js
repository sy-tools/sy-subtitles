// Live review statuses for signed-in users: the JS twin of the mapping in
// .github/scripts/sync-review-status.py. The shared fixture is the drift guard —
// tests/test_review_status_mapping_fixture.py runs the same cases through Python.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  applyIssues,
  normalizeRestIssue,
  mergeIssueLists,
  overlayReviewStatus,
  holdClaims,
  singleFlight,
  liveIssuesCacheKey,
  fetchLiveIssues,
  LIVE_ISSUES_TIMEOUT_MS,
  OPERATOR_STAGE_LABELS,
  GATE_LABEL,
  OPERATOR_LABEL,
} = require('../site/js/review_status_live');
const { spaSources } = require('./spa_sources');

const ROOT = path.join(__dirname, '..');
const CASES = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'review_status_mapping.json'), 'utf8')).cases;

describe('applyIssues — shared fixture with sync-review-status.py', () => {
  CASES.forEach((c) => {
    it(c.name, () => {
      const base = JSON.parse(JSON.stringify(c.base));
      const talks = applyIssues(base, c.issues, c.talk_ids);
      assert.deepStrictEqual(talks, c.expected);
      assert.deepStrictEqual(base, c.base, 'the base statuses are not mutated');
    });
  });

  it('declares the operator stages and labels exactly as the Python script does', () => {
    const py = fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'sync-review-status.py'), 'utf8');
    const block = py.match(/OPERATOR_STAGES = \(([\s\S]*?)\n\)/)[1];
    const pairs = Array.from(block.matchAll(/\("([^"]+)", "([^"]+)"\)/g)).map((m) => [m[1], m[2]]);
    assert.ok(pairs.length >= 6, 'parsed the Python tuple');
    assert.deepStrictEqual(OPERATOR_STAGE_LABELS, pairs);
    assert.strictEqual(GATE_LABEL, py.match(/^GATE_LABEL = "([^"]+)"/m)[1]);
    assert.strictEqual(OPERATOR_LABEL, py.match(/^OPERATOR_LABEL = "([^"]+)"/m)[1]);
  });
});

function indexPastLiteral(src, i) {
  const quote = src[i];
  let inClass = false;
  for (i++; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (quote === '/' && src[i] === '[') inClass = true;
    else if (quote === '/' && src[i] === ']') inClass = false;
    else if (src[i] === quote && !inClass) break;
    else if (src[i] === '\n' && quote !== '`') break;
  }
  return i + 1;
}

// The names one `var` / `let` / `const` list declares; `i` is just past the
// keyword. Initialisers are skipped by bracket depth, so a comma inside a call,
// a literal or a function body does not start a declarator.
function declaratorNames(src, i) {
  const names = [];
  let depth = 0, expectName = true, prev = '';
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i += 2; continue; }
    const regexStart = c === '/' && '=(,:[!&|?{};'.indexOf(prev) !== -1;
    if (c === '"' || c === "'" || c === '`' || regexStart) { i = indexPastLiteral(src, i); prev = c; continue; }
    if (c === '\n') {
      const listGoesOn = depth > 0 || prev === ',' || prev === '=' || /^\s*,/.test(src.slice(i + 1));
      if (!listGoesOn) break;
      i++; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (depth === 0 && c === ';') break;
    if (depth === 0 && expectName) {
      expectName = false;
      const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
      if (id) { names.push(id[0]); i += id[0].length; prev = 'a'; continue; }
    }
    if ('([{'.indexOf(c) !== -1) depth++;
    else if (')]}'.indexOf(c) !== -1) { if (depth === 0) break; depth--; }
    else if (depth === 0 && c === ',') expectName = true;
    prev = c; i++;
  }
  return names;
}

// Every name a classic script adds to the scope all classic scripts share. A
// declaration counts when its keyword starts a line — how this codebase writes
// top-level code. Destructuring declarations are not read.
function topLevelNames(src) {
  const names = [];
  const fnOrClass = /^(?:async[ \t]+)?function\*?[ \t]+([A-Za-z_$][\w$]*)|^class[ \t]+([A-Za-z_$][\w$]*)/gm;
  for (const m of src.matchAll(fnOrClass)) names.push(m[1] || m[2]);
  for (const m of src.matchAll(/^(?:var|let|const)[ \t]+/gm)) {
    names.push(...declaratorNames(src, m.index + m[0].length));
  }
  return names;
}

describe('shared global scope', () => {
  it('reads every form of top-level declaration', () => {
    const src = [
      'var a, b = f(1, [2, 3]), c;',
      'var d = { x: 1, y: "p, q; r" },',
      '    e = /[,;"]/.test(s), f',
      'let g = 1, h',
      'const i = `t, ${u}; v`; var notOnOwnLine = 1;',
      'class K extends Base {}',
      'async function m() { var inner1, inner2; }',
      'function* n() {}',
      'function o() {',
      '  var nested = 1, alsoNested;',
      '  function nestedFn() {}',
      '}',
      'var p = function () { return 1, 2; }, q = 3;',
      'var r // trailing, comment; here',
      'var s = 1 /* a, b; c */, t = 2;',
    ].join('\n');
    assert.deepStrictEqual(topLevelNames(src),
      ['K', 'm', 'n', 'o', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'p', 'q', 'r', 's', 't']);
  });

  // Defects, not exceptions: names two classic scripts both declare today.
  // The test holds this list to exactly what it finds, so it can only shrink —
  // removing a duplicate means deleting its entry, and nothing may be added.
  const KNOWN_CLASHES = [
    // The same one-liner in both, kept equal by a comment ("Matches
    // edit_sync's"). marker_sync.js loads later, so its copy is the one both
    // modules run in the browser, while each module's Node tests see its own.
    'markerIdentity: js/edit_sync.js, js/marker_sync.js',
  ];

  it('declares no top-level name another classic script also declares', () => {
    const sources = spaSources();
    const declaredBy = new Map(sources.map((s) => [s.name, new Set(topLevelNames(s.text))]));
    assert.ok(declaredBy.get('index.html').size > 300, 'parsed index.html');
    const mine = declaredBy.get('js/review_status_live.js');
    assert.ok(mine.has('holdClaims') && mine.has('GATE_LABEL'), 'parsed the module');
    assert.ok(sources.length > 10, 'parsed the script tags');
    const owners = new Map();
    declaredBy.forEach((names, source) => {
      names.forEach((n) => owners.set(n, (owners.get(n) || []).concat(source)));
    });
    const clashes = [...owners].filter(([, files]) => files.length > 1)
      .map(([n, files]) => n + ': ' + files.join(', ')).sort();
    assert.deepStrictEqual(clashes, KNOWN_CLASHES);
  });
});

describe('normalizeRestIssue', () => {
  it('maps a REST issue to the gh CLI shape the mapping consumes', () => {
    const row = normalizeRestIssue({
      number: 7, title: 'Review: t', state: 'open', body: 'long body that is not kept',
      labels: [{ id: 1, name: 'talk-review', color: 'fff' }, 'review:approved'],
      assignees: [{ login: 'alice', id: 9 }], updated_at: '2026-11-01T10:00:00Z',
    });
    assert.deepStrictEqual(row, {
      number: 7, title: 'Review: t',
      labels: [{ name: 'talk-review' }, { name: 'review:approved' }],
      assignees: [{ login: 'alice' }], updatedAt: '2026-11-01T10:00:00Z',
    });
  });
  it('tolerates missing labels / assignees / updated_at', () => {
    assert.deepStrictEqual(normalizeRestIssue({ number: 1, title: 'x' }),
      { number: 1, title: 'x', labels: [], assignees: [], updatedAt: '' });
  });
});

describe('mergeIssueLists', () => {
  it('unions the per-label lists and keeps one row per issue number', () => {
    const a = [{ number: 1, title: 'a' }, { number: 2, title: 'b' }];
    const b = [{ number: 2, title: 'b' }, { number: 3, title: 'c' }];
    assert.deepStrictEqual(mergeIssueLists([a, b]).map((i) => i.number), [1, 2, 3]);
  });
});

describe('overlayReviewStatus', () => {
  const issue = { number: 5, title: 'Review: t1', labels: [{ name: 'talk-review' }, { name: 'review:approved' }],
    assignees: [], updatedAt: '2026-11-01T10:00:00Z' };
  it('returns a new status object, keeping the base file fields', () => {
    const base = { version: 1, updated_at: 'X', talks: { t2: { status: 'pending' } } };
    const out = overlayReviewStatus(base, [issue], ['t1', 't2']);
    assert.notStrictEqual(out, base);
    assert.strictEqual(out.version, 1);
    assert.strictEqual(out.updated_at, 'X');
    assert.strictEqual(out.talks.t1.status, 'approved');
    assert.deepStrictEqual(out.talks.t2, { status: 'pending' });
    assert.deepStrictEqual(Object.keys(base.talks), ['t2'], 'base untouched');
  });
  it('accepts a missing base', () => {
    assert.strictEqual(overlayReviewStatus(null, [issue], ['t1']).talks.t1.issue_number, 5);
  });
});

describe('holdClaims — a just-taken talk stays "in review" until its label catches up', () => {
  const MAX = 10 * 60 * 1000;
  const claim = (since) => ({ t1: { since, entry: { status: 'in-progress', reviewer: 'me', issue_number: 5, updated_at: 'C' } } });
  const live = (over) => ({ t1: Object.assign({ status: 'pending', reviewer: 'me', issue_number: 5, updated_at: 'L',
    operator_stage: 'review' }, over) });

  it('holds the claim while GitHub shows the assignee but not yet the label', () => {
    const talks = live();
    const out = holdClaims(talks, claim(1000), 2000, MAX);
    assert.strictEqual(out.talks.t1.status, 'in-progress');
    assert.strictEqual(out.talks.t1.operator_stage, 'review', 'live operator fields survive');
    assert.deepStrictEqual(Object.keys(out.claims), ['t1']);
    assert.strictEqual(talks.t1.status, 'pending', 'input not mutated');
  });
  it('lets go once the live status has moved on', () => {
    const out = holdClaims(live({ status: 'in-progress' }), claim(1000), 2000, MAX);
    assert.deepStrictEqual(out.claims, {});
    assert.strictEqual(out.talks.t1.updated_at, 'L');
  });
  it('lets go when GitHub names another reviewer, or none', () => {
    assert.strictEqual(holdClaims(live({ reviewer: 'other' }), claim(1000), 2000, MAX).talks.t1.status, 'pending');
    assert.strictEqual(holdClaims(live({ reviewer: null }), claim(1000), 2000, MAX).talks.t1.status, 'pending');
  });
  it('lets go after the hold window, so a label that never flips cannot pin the card', () => {
    const out = holdClaims(live(), claim(1000), 1000 + MAX + 1, MAX);
    assert.strictEqual(out.talks.t1.status, 'pending');
    assert.deepStrictEqual(out.claims, {});
  });
  it('holds a claim whose talk has no live entry yet', () => {
    assert.strictEqual(holdClaims({}, claim(1000), 2000, MAX).talks.t1.status, 'in-progress');
  });
  it('a response to a request sent before the claim cannot release it', () => {
    const out = holdClaims(live({ reviewer: null }), claim(1000), 2000, MAX, 900);
    assert.strictEqual(out.talks.t1.status, 'in-progress');
    assert.strictEqual(out.talks.t1.reviewer, 'me');
    assert.deepStrictEqual(Object.keys(out.claims), ['t1']);
    assert.strictEqual(holdClaims(live({ reviewer: 'other' }), claim(1000), 2000, MAX, 1000).talks.t1.status,
      'in-progress', 'sent in the very millisecond of the claim: order unknown, so held');
  });
  it('a response to a request sent after the claim releases it as before', () => {
    const out = holdClaims(live({ reviewer: null }), claim(1000), 2000, MAX, 1001);
    assert.strictEqual(out.talks.t1.status, 'pending');
    assert.deepStrictEqual(out.claims, {});
  });
  it('the hold window still ends a claim that no later response settled', () => {
    const out = holdClaims(live({ reviewer: null }), claim(1000), 1000 + MAX + 1, MAX, 900);
    assert.strictEqual(out.talks.t1.status, 'pending');
    assert.deepStrictEqual(out.claims, {});
  });
});

describe('singleFlight — concurrent callers share one request', () => {
  it('runs once while a call is in flight and hands every caller its result', async () => {
    let runs = 0, release;
    const shared = singleFlight(() => { runs++; return new Promise((res) => { release = res; }); });
    const a = shared(), b = shared();
    assert.strictEqual(a, b);
    assert.strictEqual(runs, 1);
    release('done');
    assert.strictEqual(await a, 'done');
  });
  it('runs again once the previous call has settled, also after a rejection', async () => {
    let runs = 0;
    const shared = singleFlight(() => { runs++; return runs === 1 ? Promise.reject(new Error('x')) : Promise.resolve(runs); });
    await assert.rejects(shared());
    assert.strictEqual(await shared(), 2);
    assert.strictEqual(await shared(), 3);
  });
});

const API = 'https://api.github.com/repos/o/r';

function memStorage(seed) {
  const m = Object.assign({}, seed || {});
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    _dump: m,
  };
}

function rest(number, title, labels, updated) {
  return { number, title, labels: labels.map((name) => ({ name })), assignees: [], updated_at: updated, body: 'B' };
}

function labelFetch(byLabel, calls) {
  return async (url, init) => {
    const label = decodeURIComponent(/labels=([^&]+)/.exec(url)[1]);
    const headers = (init && init.headers) || {};
    calls.push({ url, label, headers });
    const spec = byLabel[label];
    if (spec.status && spec.status !== 200) {
      return { ok: false, status: spec.status, headers: { get: (n) => (spec.headers || {})[n] || null },
        json: async () => ({ message: 'nope' }) };
    }
    if (headers['If-None-Match'] && headers['If-None-Match'] === spec.etag) {
      return { ok: false, status: 304, headers: { get: () => null }, json: async () => { throw new Error('no body'); } };
    }
    return { ok: true, status: 200, headers: { get: (n) => (n === 'ETag' ? spec.etag : null) },
      json: async () => spec.rows };
  };
}

describe('fetchLiveIssues', () => {
  const world = () => ({
    'talk-review': { etag: 'W/"r1"', rows: [rest(1, 'Review: t1', ['talk-review'], '2026-11-01T10:00:00Z'),
      rest(9, 'Operator: t1', ['talk-review', 'talk-operator'], '2026-11-02T10:00:00Z')] },
    'talk-operator': { etag: 'W/"o1"', rows: [rest(9, 'Operator: t1', ['talk-review', 'talk-operator'], '2026-11-02T10:00:00Z')] },
  });

  it('cache keys are per branch and per label', () => {
    assert.notStrictEqual(liveIssuesCacheKey('main', 'talk-review'), liveIssuesCacheKey('main', 'talk-operator'));
    assert.notStrictEqual(liveIssuesCacheKey('main', 'talk-review'), liveIssuesCacheKey('dev', 'talk-review'));
  });

  it('asks one query per label (labels= is AND) and merges them in the gh CLI shape', async () => {
    const calls = [];
    const storage = memStorage();
    const issues = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage,
      fetchImpl: labelFetch(world(), calls) });
    assert.deepStrictEqual(calls.map((c) => c.label).sort(), ['talk-operator', 'talk-review']);
    calls.forEach((c) => {
      assert.ok(/state=all/.test(c.url) && /per_page=100/.test(c.url), c.url);
      assert.strictEqual(c.headers.Authorization, 'Bearer gho_x');
    });
    assert.deepStrictEqual(issues.map((i) => i.number).sort(), [1, 9]);
    assert.strictEqual(issues[0].updatedAt !== undefined, true, 'normalised to updatedAt');
    assert.strictEqual(issues[0].body, undefined, 'bodies are not kept');
  });

  it('persists the ETag and replays it; a 304 yields the cached issues', async () => {
    const storage = memStorage();
    const first = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage,
      fetchImpl: labelFetch(world(), []) });
    const calls = [];
    const second = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage,
      fetchImpl: labelFetch(world(), calls) });
    assert.deepStrictEqual(calls.map((c) => c.headers['If-None-Match']).sort(), ['W/"o1"', 'W/"r1"']);
    assert.deepStrictEqual(second, first);
  });

  it('a changed label list replaces only that label\'s cache', async () => {
    const storage = memStorage();
    await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage, fetchImpl: labelFetch(world(), []) });
    const w = world();
    w['talk-review'] = { etag: 'W/"r2"', rows: [rest(1, 'Review: t1', ['talk-review', 'review:approved'], '2026-11-05T10:00:00Z')] };
    const issues = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage, fetchImpl: labelFetch(w, []) });
    const one = issues.find((i) => i.number === 1);
    assert.deepStrictEqual(one.labels, [{ name: 'talk-review' }, { name: 'review:approved' }]);
    assert.ok(issues.find((i) => i.number === 9), 'the 304 label still contributes its cached rows');
    const stored = JSON.parse(storage.getItem(liveIssuesCacheKey('main', 'talk-review')));
    assert.strictEqual(stored.pages[0].etag, 'W/"r2"');
  });

  it('a corrupt cache entry is ignored, not fatal', async () => {
    const storage = memStorage({ [liveIssuesCacheKey('main', 'talk-review')]: '{not json' });
    const calls = [];
    const issues = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage,
      fetchImpl: labelFetch(world(), calls) });
    assert.strictEqual(issues.length, 2);
    assert.strictEqual(calls.find((c) => c.label === 'talk-review').headers['If-None-Match'], undefined);
  });

  it('a storage that throws on write still returns the issues', async () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const issues = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage,
      fetchImpl: labelFetch(world(), []) });
    assert.strictEqual(issues.length, 2);
  });

  it('rejects when either query fails, carrying the status (the caller keeps the base statuses)', async () => {
    const w = world();
    w['talk-operator'] = { status: 401 };
    await assert.rejects(
      fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage: memStorage(), fetchImpl: labelFetch(w, []) }),
      (e) => e.status === 401);
  });
});

describe('fetchLiveIssues — a request that never answers', () => {
  const flush = () => new Promise((res) => setImmediate(res));
  const hungFetch = (signals) => (url, init) => { signals.push(init && init.signal); return new Promise(() => {}); };

  it('gives up after 15 seconds by default', () => {
    assert.strictEqual(LIVE_ISSUES_TIMEOUT_MS, 15000);
  });

  it('rejects once the timeout passes — not before — and aborts the requests', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const signals = [];
    let outcome = 'pending';
    const p = fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage: memStorage(),
      fetchImpl: hungFetch(signals), timeoutMs: 15000 });
    p.then(() => { outcome = 'resolved'; }, () => { outcome = 'rejected'; });

    t.mock.timers.tick(14999);
    await flush();
    assert.strictEqual(outcome, 'pending');
    assert.ok(signals.length === 2 && signals.every((s) => s && !s.aborted));

    t.mock.timers.tick(1);
    await assert.rejects(p, (e) => e.name === 'TimeoutError' && e.status === undefined);
    assert.ok(signals.every((s) => s.aborted), 'the hung requests were aborted');
  });

  it('a body that never arrives times out too', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const headersOnly = async () => ({ ok: true, status: 200, headers: { get: () => null },
      json: () => new Promise(() => {}) });
    const p = fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage: memStorage(),
      fetchImpl: headersOnly, timeoutMs: 15000 });
    await flush();
    t.mock.timers.tick(15000);
    await assert.rejects(p, (e) => e.name === 'TimeoutError');
  });

  it('singleFlight lets go of a timed-out request: the next caller starts a new one', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let fetchImpl = hungFetch([]);
    const shared = singleFlight(() => fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main',
      storage: memStorage(), fetchImpl, timeoutMs: 15000 }));
    const first = shared();
    assert.strictEqual(shared(), first, 'still one request while it hangs');
    t.mock.timers.tick(15000);
    await assert.rejects(first);

    const w = { 'talk-review': { etag: 'W/"r1"', rows: [rest(1, 'Review: t1', ['talk-review'], '2026-11-01T10:00:00Z')] },
      'talk-operator': { etag: 'W/"o1"', rows: [] } };
    fetchImpl = labelFetch(w, []);
    const second = shared();
    assert.notStrictEqual(second, first);
    assert.strictEqual((await second).length, 1);
  });

  it('an answer in time leaves no timer behind', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const w = { 'talk-review': { etag: 'W/"r1"', rows: [] }, 'talk-operator': { etag: 'W/"o1"', rows: [] } };
    const signals = [];
    const answered = labelFetch(w, []);
    const issues = await fetchLiveIssues({ api: API, token: 'gho_x', branch: 'main', storage: memStorage(),
      fetchImpl: (url, init) => { signals.push(init.signal); return answered(url, init); }, timeoutMs: 15000 });
    assert.deepStrictEqual(issues, []);
    t.mock.timers.tick(60000);
    assert.ok(signals.every((s) => !s.aborted), 'the timeout was cancelled, nothing is aborted later');
  });
});
