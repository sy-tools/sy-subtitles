const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  BURN_WORKFLOW,
  makeRequestId,
  buildBurnInputs,
  burnRunLabel,
  matchRun,
  burnStateKey,
} = require('../site/js/burn_video');

describe('makeRequestId', () => {
  it('is unique per call even within the same millisecond', () => {
    let n = 0;
    const rand = () => [0.1, 0.9][n++];
    const a = makeRequestId(1700000000000, rand);
    const b = makeRequestId(1700000000000, rand);
    assert.notStrictEqual(a, b);
  });

  it('contains only characters safe for a run name and a URL query', () => {
    const id = makeRequestId(1700000000000, () => 0.5);
    assert.match(id, /^[A-Za-z0-9-]+$/);
  });
});

const {
  BURN_TITLE_SEP,
  BURN_RETENTION_MS,
  BURN_CLIP_MIN_MS,
  BURN_CLIP_MAX_MS,
  parseBurnRunTitle,
  burnHistoryEntries,
  burnHistorySince,
  burnClipProblem,
} = require('../site/js/burn_video');

describe('buildBurnInputs', () => {
  const ratios = { font_ratio: 0.0711, padtop_ratio: 0.0741, padbot_ratio: 0.0333 };
  const opts = { sourceRef: 'main', subsScale: 1 };
  const withOpts = (over) => buildBurnInputs('talk', 'slug', ratios, 'r',
                                             Object.assign({}, opts, over));

  it('sends every input the workflow declares', () => {
    const inputs = buildBurnInputs('talk', 'slug', ratios, 'req-1', opts);
    assert.deepStrictEqual(Object.keys(inputs).sort(), [
      'clip', 'font_ratio', 'padbot_ratio', 'padtop_ratio', 'request_id',
      'run_label', 'source_ref', 'subs_scale', 'talk_id', 'video_slug',
    ]);
  });

  it('stringifies the ratios — workflow_dispatch inputs are strings', () => {
    const inputs = buildBurnInputs('talk', 'slug', ratios, 'req-1', opts);
    assert.strictEqual(typeof inputs.font_ratio, 'string');
    assert.strictEqual(inputs.font_ratio, '0.0711');
  });

  it('rejects a missing ratio instead of sending undefined', () => {
    assert.throws(() => buildBurnInputs('talk', 'slug', { font_ratio: 0.05 }, 'r', opts),
                  /ratio/);
  });

  it('demands the content ref rather than letting the workflow default it', () => {
    // The workflow defaults source_ref to main so a hand-started run works.
    // A SPA that forgot to send it would therefore render the PUBLISHED
    // subtitles while showing the reviewer their edits, and look successful.
    assert.throws(() => buildBurnInputs('talk', 'slug', ratios, 'req-1'),
                  /source ref/i);
    assert.throws(() => buildBurnInputs('talk', 'slug', ratios, 'req-1', { sourceRef: '' }),
                  /source ref/i);
  });

  it('passes the content ref through untouched', () => {
    const inputs = buildBurnInputs('talk', 'slug', ratios, 'req-1',
                                   { sourceRef: 'sync/me/talk--slug-uk', subsScale: 1 });
    assert.strictEqual(inputs.source_ref, 'sync/me/talk--slug-uk');
  });

  it('sends an empty label rather than omitting the input', () => {
    // An absent input is not the same as an empty one: the run-name expression
    // needs a value to fall back from.
    assert.strictEqual(buildBurnInputs('talk', 'slug', ratios, 'r', opts).run_label, '');
  });

  it('sends the subtitle scale as a whole percent', () => {
    assert.strictEqual(withOpts({ subsScale: 1 }).subs_scale, '100');
    assert.strictEqual(withOpts({ subsScale: 1.5 }).subs_scale, '150');
    assert.strictEqual(withOpts({ subsScale: 1.234 }).subs_scale, '123');
    assert.strictEqual(withOpts({ subsScale: 0.5 }).subs_scale, '50');
  });

  it('clamps the percent into the band the run name can carry', () => {
    // parseBurnRunTitle reads 10..1000 back; a value outside would name a run
    // the list can never show. The resize handle stays well inside, so this
    // guards a caller, not a reviewer.
    assert.strictEqual(withOpts({ subsScale: 0.01 }).subs_scale, '10');
    assert.strictEqual(withOpts({ subsScale: 25 }).subs_scale, '1000');
  });

  it('demands the subtitle scale rather than guessing one', () => {
    // The list reads the size back out of the run name, so a default would
    // label a 150% video as 100% for as long as it is listed.
    for (const subsScale of [undefined, null, NaN, Infinity, 0, -1, '1.5']) {
      assert.throws(() => buildBurnInputs('talk', 'slug', ratios, 'r',
                                          { sourceRef: 'main', subsScale }),
                    /subtitle scale/, String(subsScale));
    }
  });

  it('sends an empty clip for the whole video', () => {
    // Empty, not absent — the same rule as run_label.
    assert.strictEqual(withOpts({}).clip, '');
    assert.strictEqual(withOpts({ clip: null }).clip, '');
  });

  it('sends a fragment as START-END whole milliseconds', () => {
    assert.strictEqual(withOpts({ clip: { startMs: 600000, endMs: 930500 } }).clip,
                       '600000-930500');
    // Exactly the shortest fragment the render takes.
    assert.strictEqual(BURN_CLIP_MIN_MS, 1000);
    assert.strictEqual(withOpts({ clip: { startMs: 0, endMs: 1000 } }).clip, '0-1000');
  });

  it('refuses a fragment the workflow would refuse, before dispatching it', () => {
    const bad = [
      { startMs: 5000, endMs: 5000 },                     // empty
      { startMs: 6000, endMs: 5000 },                     // backwards
      { startMs: 0, endMs: 999 },                         // below the minimum
      { startMs: -1000, endMs: 5000 },                    // negative
      { startMs: 1000.5, endMs: 5000 },                   // not whole milliseconds
      { startMs: '0', endMs: '5000' },                    // text, not numbers
      { startMs: 0, endMs: Number.MAX_SAFE_INTEGER + 1 }, // not exact
      { startMs: NaN, endMs: 5000 },
      {},
      '0-5000',
    ];
    for (const clip of bad) {
      assert.throws(() => withOpts({ clip }), /invalid clip/, JSON.stringify(clip));
    }
  });

  it('sends values the run-name parser reads back', () => {
    // burn-subtitles.yml builds the run name out of these inputs,
    //   run_label · talk_id/video_slug · actor · subs_scale% · (clip or full) · request_id
    // so whatever the SPA sends has to fit the grammar the list parses.
    const requestId = makeRequestId(1757764800000, () => 0.5);
    const inputs = buildBurnInputs('1993-09-19_Ganesha-Puja', 'Talk-Cabella', ratios, requestId, {
      sourceRef: 'main', subsScale: 1.5, talkTitle: 'Ganesha Puja', videoTitle: 'Talk',
      clip: { startMs: 600000, endMs: 930500 },
    });
    const title = [inputs.run_label, inputs.talk_id + '/' + inputs.video_slug, 'SlavaSubotskiy',
                   inputs.subs_scale + '%', inputs.clip || 'full', inputs.request_id]
      .join(BURN_TITLE_SEP);
    assert.deepStrictEqual(parseBurnRunTitle(title), {
      label: 'Ganesha Puja — Talk', talkId: '1993-09-19_Ganesha-Puja', videoSlug: 'Talk-Cabella',
      actor: 'SlavaSubotskiy', scalePct: 150,
      clip: { startMs: 600000, endMs: 930500 }, requestId: requestId,
    });
  });
});

// ---------------------------------------------------------------------------
// The already-created videos. burn-subtitles.yml names every run
//   label · talk_id/video_slug · actor · subs_scale% · clip-or-full · request_id
// and the list is read out of those names alone: one runs request, no per-run
// lookups.
// ---------------------------------------------------------------------------
const TALK = '1993-09-19_Ganesha-Puja-Cabella';
const SLUG = 'Talk-Cabella';

function runTitle(over) {
  const f = Object.assign({
    label: 'Ganesha Puja — Talk, Cabella', talk: TALK, slug: SLUG,
    actor: 'SlavaSubotskiy', scale: '150%', clip: 'full', req: 'req-mf1abc-2s3',
  }, over);
  return [f.label, f.talk + '/' + f.slug, f.actor, f.scale, f.clip, f.req].join(' · ');
}

describe('parseBurnRunTitle', () => {
  it('reads every field of the run name', () => {
    assert.deepStrictEqual(parseBurnRunTitle(runTitle({ clip: '600000-930500' })), {
      label: 'Ganesha Puja — Talk, Cabella', talkId: TALK, videoSlug: SLUG,
      actor: 'SlavaSubotskiy', scalePct: 150,
      clip: { startMs: 600000, endMs: 930500 }, requestId: 'req-mf1abc-2s3',
    });
  });

  it('splits on the separator the workflow writes', () => {
    assert.strictEqual(BURN_TITLE_SEP, ' · ');
  });

  it('reads "full" as the whole video', () => {
    assert.strictEqual(parseBurnRunTitle(runTitle()).clip, null);
  });

  it('reads a fragment that starts at zero', () => {
    assert.deepStrictEqual(parseBurnRunTitle(runTitle({ clip: '0-1000' })).clip,
                           { startMs: 0, endMs: 1000 });
  });

  it('keeps a label that contains the separator itself whole', () => {
    // The label is a free-text title from meta.yaml, so the fields are taken
    // from the right and whatever is left over is the label.
    const parsed = parseBurnRunTitle(runTitle({ label: 'Puja · Talk · Q&A' }));
    assert.strictEqual(parsed.label, 'Puja · Talk · Q&A');
    assert.strictEqual(parsed.talkId, TALK);
    assert.strictEqual(parsed.requestId, 'req-mf1abc-2s3');
  });

  it('keeps a label that ENDS in a piece of the separator whole as well', () => {
    // The label is free text: it may not only contain the separator but end in
    // half of one. A left-to-right split then took the label's own " · " as the
    // first separator and read every field one place over — the place field
    // arrived as "· 1993-09-19_…", failed to parse, and the video that run had
    // made was simply missing from the list, for good.
    for (const label of ['Ganesha Puja ·', 'Ganesha Puja · ', '· Ganesha Puja ·']) {
      const parsed = parseBurnRunTitle(runTitle({ label }));
      assert.ok(parsed, 'no run may be lost to its own title: ' + JSON.stringify(label));
      assert.strictEqual(parsed.label, label);
      assert.strictEqual(parsed.talkId, TALK);
      assert.strictEqual(parsed.requestId, 'req-mf1abc-2s3');
    }
  });

  it('does not read the old two-segment run name', () => {
    // "label · request_id" carries no talk, author or size to list.
    assert.strictEqual(parseBurnRunTitle('Ganesha Puja — Talk, Cabella · req-mf1abc-2s3'), null);
    // Nor one whose label happens to pad it out to six segments.
    assert.strictEqual(parseBurnRunTitle('a · b · c · d · e · req-mf1abc-2s3'), null);
  });

  it('reads the request id makeRequestId produces', () => {
    const req = makeRequestId(1757764800000, () => 0.73);
    assert.strictEqual(parseBurnRunTitle(runTitle({ req })).requestId, req);
  });

  it('accepts the ends of the scale band, and an App as the author', () => {
    assert.strictEqual(parseBurnRunTitle(runTitle({ scale: '10%' })).scalePct, 10);
    assert.strictEqual(parseBurnRunTitle(runTitle({ scale: '1000%' })).scalePct, 1000);
    assert.strictEqual(parseBurnRunTitle(runTitle({ actor: 'github-actions[bot]' })).actor,
                       'github-actions[bot]');
  });

  it('refuses a run name with any field out of shape', () => {
    const bad = {
      talk: ['1993-09-19', '93-09-19_Talk', '1993-09-19_Ganesha Puja',
             '1993-09-19_' + 'x'.repeat(81)],
      slug: ['.hidden', '-rf', 'a/b', 'x'.repeat(65), ''],
      actor: ['-lead', 'a_b', 'x'.repeat(40), 'bot[bot]x', ''],
      scale: ['9%', '1001%', '150', '0150%', '15.5%', '10000%'],
      clip: ['FULL', '1000-1000', '2000-1000', '01-2000', '0-0', '-1000', '1000-',
             '0-1234567890', 'abc'],
      req: ['req-ABC-def', 'req-abc', 'abc-def-ghi', 'req-abc-def-ghi', ''],
    };
    for (const field of Object.keys(bad)) {
      for (const value of bad[field]) {
        assert.strictEqual(parseBurnRunTitle(runTitle({ [field]: value })), null,
                           field + '=' + JSON.stringify(value));
      }
    }
  });

  it('refuses what is not a run name at all', () => {
    for (const v of [null, undefined, 42, '', 'Burn subtitles']) {
      assert.strictEqual(parseBurnRunTitle(v), null, String(v));
    }
    // The dot without its spaces is not the separator.
    assert.strictEqual(parseBurnRunTitle(runTitle().split(' · ').join('·')), null);
  });
});

describe('burnHistoryEntries', () => {
  const NOW = Date.parse('2026-09-13T12:00:00Z');
  const Q = { talkId: TALK, videoSlug: SLUG, login: 'SlavaSubotskiy', nowMs: NOW };

  function run(id, over, titleOver) {
    return Object.assign({
      id, conclusion: 'success', created_at: '2026-09-12T10:00:00Z',
      html_url: 'https://github.com/sy-tools/sy-subtitles/actions/runs/' + id,
      display_title: runTitle(titleOver),
    }, over);
  }
  const ids = (entries) => entries.map((e) => e.runId);

  it('lists a finished render of this video with what its row shows', () => {
    const entries = burnHistoryEntries([run(11, {}, { clip: '600000-930500' })], Q);
    assert.deepStrictEqual(entries, [{
      runId: 11,
      createdMs: Date.parse('2026-09-12T10:00:00Z'),
      actor: 'SlavaSubotskiy', mine: true, scalePct: 150,
      clip: { startMs: 600000, endMs: 930500 }, requestId: 'req-mf1abc-2s3',
    }]);
  });

  it("lists every author's videos, and marks the viewer's own", () => {
    // The row names the author only when it is someone else.
    const entries = burnHistoryEntries([
      run(1, {}, { actor: 'SlavaSubotskiy' }),
      run(2, {}, { actor: 'ira-k' }),
      run(3, {}, { actor: 'github-actions[bot]' }),
    ], Q);
    assert.deepStrictEqual(entries.map((e) => [e.runId, e.actor, e.mine]), [
      [3, 'github-actions[bot]', false], [2, 'ira-k', false], [1, 'SlavaSubotskiy', true],
    ]);
  });

  it("recognises the viewer's own videos whatever the case of the login", () => {
    // GitHub logins are case-insensitive.
    const [entry] = burnHistoryEntries([run(1, {}, { actor: 'slavasubotskiy' })], Q);
    assert.strictEqual(entry.mine, true);
  });

  it('claims no video for a viewer without a login, and still lists them all', () => {
    for (const login of ['', null, undefined]) {
      const entries = burnHistoryEntries([run(1), run(2, {}, { actor: 'ira-k' })],
                                         Object.assign({}, Q, { login }));
      assert.deepStrictEqual(entries.map((e) => [e.runId, e.mine]), [[2, false], [1, false]],
                             String(login));
    }
  });

  it('lists only this talk and this video, spelled exactly', () => {
    const entries = burnHistoryEntries([
      run(1),
      run(2, {}, { talk: TALK + '-2' }),
      run(3, {}, { slug: SLUG + '-2' }),
      run(4, {}, { slug: SLUG.toLowerCase() }),
      run(5, {}, { talk: '1993-09-20_Ganesha-Puja-Cabella' }),
    ], Q);
    assert.deepStrictEqual(ids(entries), [1]);
  });

  it('leaves out a run whose name does not parse, reading name when there is no title', () => {
    const entries = burnHistoryEntries([
      run(1, { display_title: 'Ganesha Puja — Talk, Cabella · req-mf1abc-2s3' }),
      run(2, { display_title: undefined, name: runTitle() }),
      run(3, { display_title: null, name: null }),
    ], Q);
    assert.deepStrictEqual(ids(entries), [2]);
  });

  it('lists only successful runs, whatever the query asked for', () => {
    // The request filters on status=success, but a stale or odd payload must
    // not offer the file of a run that never uploaded one.
    const entries = burnHistoryEntries([
      run(1), run(2, { conclusion: 'failure' }), run(3, { conclusion: 'cancelled' }),
      run(4, { conclusion: null }),
    ], Q);
    assert.deepStrictEqual(ids(entries), [1]);
  });

  it('drops a video once its artifact is past the seven-day retention', () => {
    const at = (ms) => new Date(ms).toISOString();
    const entries = burnHistoryEntries([
      run(1, { created_at: at(NOW - BURN_RETENTION_MS + 1) }),   // one ms to spare
      run(2, { created_at: at(NOW - BURN_RETENTION_MS) }),       // gone
      run(3, { created_at: at(NOW - BURN_RETENTION_MS - 3600000) }),
    ], Q);
    assert.deepStrictEqual(ids(entries), [1]);
  });

  it("keeps a video the viewer's clock places in the future", () => {
    // A client clock running behind must not hide a video that was just made.
    const entries = burnHistoryEntries([run(1, { created_at: '2026-09-13T12:05:00Z' })], Q);
    assert.deepStrictEqual(ids(entries), [1]);
  });

  it('leaves out a run with no readable creation time', () => {
    const entries = burnHistoryEntries([
      run(1, { created_at: '' }), run(2, { created_at: 'yesterday' }),
      run(3, { created_at: undefined }),
    ], Q);
    assert.deepStrictEqual(entries, []);
  });

  it('puts the newest first, and the higher run id first on a tie', () => {
    const entries = burnHistoryEntries([
      run(5, { created_at: '2026-09-10T08:00:00Z' }),
      run(6, { created_at: '2026-09-12T09:00:00Z' }),
      run(7, { created_at: '2026-09-12T09:00:00Z' }),
      run(9, { created_at: '2026-09-11T09:00:00Z' }),
    ], Q);
    assert.deepStrictEqual(ids(entries), [7, 6, 9, 5]);
  });

  it('lists a run once even when the payload repeats it', () => {
    // Pages are fetched one after another, and a run finishing in between
    // shifts the list by one, so the same run can arrive on two pages.
    const entries = burnHistoryEntries([run(1), run(2), run(1)], Q);
    assert.deepStrictEqual(ids(entries), [2, 1]);
  });

  it('tolerates junk rows and a missing list', () => {
    assert.deepStrictEqual(burnHistoryEntries([null, undefined, {}, 42], Q), []);
    assert.deepStrictEqual(burnHistoryEntries(null, Q), []);
  });
});

describe('burnHistorySince', () => {
  it('is seven days before now, as the date-time the runs filter takes', () => {
    assert.strictEqual(BURN_RETENTION_MS, 7 * 24 * 60 * 60 * 1000);
    assert.strictEqual(burnHistorySince(Date.parse('2026-09-13T12:00:00Z')),
                       '2026-09-06T12:00:00Z');
  });

  it('drops the milliseconds, which moves the bound earlier and never later', () => {
    // Earlier can only fetch a run burnHistoryEntries then drops; later could
    // miss one it would list.
    assert.strictEqual(burnHistorySince(Date.parse('2026-09-13T12:00:00.999Z')),
                       '2026-09-06T12:00:00Z');
  });
});

describe('burnClipProblem', () => {
  const HOUR = 3600000;

  it('has nothing to say about a sound fragment', () => {
    assert.strictEqual(burnClipProblem(600000, 930500, HOUR), '');
    assert.strictEqual(burnClipProblem(0, BURN_CLIP_MIN_MS, HOUR), '');
    // Ending exactly where the video ends is inside it.
    assert.strictEqual(burnClipProblem(HOUR - 5000, HOUR, HOUR), '');
  });

  it('does not judge the end against a duration it does not know', () => {
    for (const duration of [undefined, null, NaN, 0, -1]) {
      assert.strictEqual(burnClipProblem(0, 10 * HOUR, duration), '', String(duration));
    }
  });

  it('names a start that is not a time', () => {
    for (const start of [null, undefined, NaN, Infinity, '10']) {
      assert.strictEqual(burnClipProblem(start, 5000, HOUR), 'clip.bad_start', String(start));
    }
  });

  it('names an end that is not a time', () => {
    for (const end of [null, undefined, NaN, -Infinity, '10']) {
      assert.strictEqual(burnClipProblem(0, end, HOUR), 'clip.bad_end', String(end));
    }
  });

  it('names a span that is empty or runs backwards', () => {
    assert.strictEqual(burnClipProblem(5000, 5000, HOUR), 'clip.order');
    assert.strictEqual(burnClipProblem(6000, 5000, HOUR), 'clip.order');
  });

  it('names an end past the end of the video', () => {
    assert.strictEqual(burnClipProblem(0, HOUR + 1, HOUR), 'clip.past_end');
  });

  it('names a fragment shorter than the render takes', () => {
    assert.strictEqual(burnClipProblem(0, BURN_CLIP_MIN_MS - 1, HOUR), 'clip.too_short');
  });

  it('names a bound past what the render can carry, length known or not', () => {
    // The workflow's clip grammar stops at nine digits of milliseconds and the
    // run-name parser stops with it. Unjudged here, a "300:00:00" typed while
    // the player's length was still unknown was accepted by the panel and then
    // thrown out by buildBurnInputs — whose "burn: invalid clip" is an English
    // exception, not a sentence the panel can show anyone.
    assert.strictEqual(burnClipProblem(0, BURN_CLIP_MAX_MS, null), '',
      'the bound itself is still a fragment the render takes');
    assert.strictEqual(burnClipProblem(0, BURN_CLIP_MAX_MS + 1, null), 'clip.bad_end');
    assert.strictEqual(burnClipProblem(BURN_CLIP_MAX_MS + 1, BURN_CLIP_MAX_MS + 5000, null),
                       'clip.bad_start');
    // A known length is the closer bound and the more useful sentence, so it
    // still goes first.
    assert.strictEqual(burnClipProblem(0, BURN_CLIP_MAX_MS + 1, HOUR), 'clip.past_end');
  });

  it('names only the first problem, in a fixed order', () => {
    // One message at a time, and the one to fix first: an end cannot be judged
    // against a start that is not a time, nor a length against a backwards span.
    assert.strictEqual(burnClipProblem(NaN, NaN, HOUR), 'clip.bad_start');
    assert.strictEqual(burnClipProblem(7000, 5000, 4000), 'clip.order');
    assert.strictEqual(burnClipProblem(4500, 5000, 4800), 'clip.past_end');
  });
});

describe('burnRunLabel', () => {
  it('reads like the preview heading: talk — video', () => {
    assert.strictEqual(burnRunLabel('Ganesha Puja', 'Talk, Cabella'),
                       'Ganesha Puja — Talk, Cabella');
  });

  it('falls back to whichever part it has', () => {
    assert.strictEqual(burnRunLabel('Ganesha Puja', ''), 'Ganesha Puja');
    assert.strictEqual(burnRunLabel('', 'Talk, Cabella'), 'Talk, Cabella');
    assert.strictEqual(burnRunLabel('', ''), '');
    assert.strictEqual(burnRunLabel(null, undefined), '');
  });

  it('collapses whitespace so the run name stays one line', () => {
    assert.strictEqual(burnRunLabel('  Ganesha\n\tPuja  ', 'Cabella'),
                       'Ganesha Puja — Cabella');
  });

  it('drops control characters', () => {
    // Titles come from meta.yaml, which humans edit. Escaped here on purpose:
    // a raw control byte in a source file makes grep treat it as binary.
    assert.strictEqual(burnRunLabel('Gan\u0001esha\u001b', ''), 'Ganesha');
  });

  it('truncates a long title instead of flooding the run list', () => {
    const label = burnRunLabel('x'.repeat(300), 'y'.repeat(300));
    assert.ok(label.length <= 120, 'label is ' + label.length + ' chars');
    assert.ok(label.endsWith('…'));
  });

  it('leaves a label that already fits exactly alone', () => {
    const label = burnRunLabel('x'.repeat(120), '');
    assert.strictEqual(label, 'x'.repeat(120));
  });
});

describe('matchRun', () => {
  const runs = [
    { id: 1, name: 'Burn a/b · req-OTHER', status: 'completed' },
    { id: 2, display_title: 'Burn a/b · req-MINE', status: 'in_progress' },
  ];

  it('finds the run by request id in either name field', () => {
    assert.strictEqual(matchRun(runs, 'req-MINE').id, 2);
    assert.strictEqual(matchRun(runs, 'req-OTHER').id, 1);
  });

  it('returns null when the run has not been created yet', () => {
    // dispatch -> run creation is not instant; the caller retries.
    assert.strictEqual(matchRun([], 'req-MINE'), null);
    assert.strictEqual(matchRun(runs, 'req-ABSENT'), null);
  });

  it('does not match on a partial id prefix of another run', () => {
    const rows = [{ id: 9, name: 'Burn a/b · req-MINE-EXTRA' }];
    assert.strictEqual(matchRun(rows, 'req-MINE'), null);
  });

  it('tolerates malformed rows', () => {
    assert.strictEqual(matchRun([null, {}, { name: null }], 'req'), null);
  });
});

describe('burnStateKey', () => {
  it('is scoped per talk and video', () => {
    assert.notStrictEqual(burnStateKey('t', 'a'), burnStateKey('t', 'b'));
    assert.match(burnStateKey('t', 'a'), /^sy\.burn\./);
  });
});

describe('burnRef', () => {
  const { burnRef, BURN_DEFAULT_REF } = require('../site/js/burn_video');

  it('dispatches against the default branch in production', () => {
    assert.strictEqual(BURN_DEFAULT_REF, 'main');
    assert.strictEqual(burnRef({}), 'main');
    assert.strictEqual(burnRef(null), 'main');
  });

  it('honours a local override so a branch workflow can be exercised', () => {
    // Without this, a workflow change cannot be tested from the UI at all:
    // the dispatch would run the default branch's OLD file and prove nothing.
    assert.strictEqual(burnRef({ __SY_BURN_REF: 'my-branch' }), 'my-branch');
  });

  it('ignores a blank or non-string override rather than dispatching nowhere', () => {
    assert.strictEqual(burnRef({ __SY_BURN_REF: '' }), 'main');
    assert.strictEqual(burnRef({ __SY_BURN_REF: 7 }), 'main');
  });
});

describe('BURN_WORKFLOW', () => {
  it('points at the workflow file', () => {
    assert.strictEqual(BURN_WORKFLOW, 'burn-subtitles.yml');
  });
});

const {
  FONT_RATIO_MAX,
  FONT_RATIO_MIN,
  FS_FONT_WIDTH_RATIO,
  FS_PADTOP_RATIO,
  FS_PADBOT_RATIO,
  measureBurnRatios,
} = require('../site/js/burn_video');

describe('fullscreen box constants', () => {
  it('keep the approved 1080p look: 4% of width, 80px over and 36px under', () => {
    assert.strictEqual(FS_FONT_WIDTH_RATIO, 0.04);
    assert.ok(Math.abs(FS_PADTOP_RATIO - 80 / 1080) < 1e-12);
    assert.ok(Math.abs(FS_PADBOT_RATIO - 36 / 1080) < 1e-12);
  });
});

describe('measureBurnRatios', () => {
  const hd = { videoWidth: 1920, videoHeight: 1080, subsScale: 1 };

  it('reproduces the approved fullscreen baseline for a 16:9 video', () => {
    const r = measureBurnRatios(hd);
    // 4% of the video width over its height: 76.8 / 1080 = 0.0711.
    assert.ok(Math.abs(r.font_ratio - 76.8 / 1080) < 1e-12);
    assert.ok(Math.abs(r.padtop_ratio - 80 / 1080) < 1e-12);
    assert.ok(Math.abs(r.padbot_ratio - 36 / 1080) < 1e-12);
  });

  it('does not depend on the device the render was started from', () => {
    // A phone held upright used to measure 28px (the CSS floor) over a 219px
    // tall video: font 0.12 (clamped) and a band covering ~80% of the frame.
    // The box is the video's own, so the screen has no say at all.
    const phone = measureBurnRatios(Object.assign({}, hd, {
      viewportWidth: 390, viewportHeight: 844,
    }));
    assert.deepStrictEqual(phone, measureBurnRatios(hd));
  });

  it('keeps the characters per line for a 4:3 video', () => {
    // Sized from the width, so a narrower frame gets proportionally smaller
    // letters and the same number of them per line.
    const r = measureBurnRatios({ videoWidth: 640, videoHeight: 480, subsScale: 1 });
    assert.ok(Math.abs(r.font_ratio - 0.04 * 640 / 480) < 1e-12);
  });

  it('grows the font ratio when the user enlarged the subtitles', () => {
    const bigger = measureBurnRatios(Object.assign({}, hd, { subsScale: 1.5 }));
    assert.ok(bigger.font_ratio > measureBurnRatios(hd).font_ratio);
  });

  it('clamps a ratio the workflow would refuse', () => {
    // The resize handle allows --preview-subs-scale up to 4, which measures
    // 0.28 on a 16:9 video — outside the [0.02, 0.12] band the workflow's
    // "Validate inputs" step enforces, so the run would die before it started.
    const huge = measureBurnRatios(Object.assign({}, hd, { subsScale: 4 }));
    assert.strictEqual(huge.font_ratio, FONT_RATIO_MAX);
    // Just past the point where the raw measurement leaves the band (scale 1.7
    // measures 0.1209) — the boundary a reviewer really hits.
    const past = measureBurnRatios(Object.assign({}, hd, { subsScale: 1.7 }));
    assert.strictEqual(past.font_ratio, FONT_RATIO_MAX);
  });

  it('leaves a legal ratio exactly as measured', () => {
    // The clamp must be a guard, not a rounding: scale 1.5 measures 0.1067,
    // which is inside the band and must travel untouched.
    const legal = measureBurnRatios(Object.assign({}, hd, { subsScale: 1.5 }));
    assert.ok(Math.abs(legal.font_ratio - (76.8 * 1.5) / 1080) < 1e-12);
    assert.ok(legal.font_ratio < FONT_RATIO_MAX);
  });

  it('clamps up to the floor when the measurement is absurdly small', () => {
    // A portrait 9:16 video with the subtitles shrunk to 0.5x: 4% of a width
    // that is 0.5625 of the height, halved = 0.01125, below the floor the
    // workflow accepts. The burner clamps the same way.
    const tiny = measureBurnRatios({ videoWidth: 9, videoHeight: 16, subsScale: 0.5 });
    assert.strictEqual(tiny.font_ratio, FONT_RATIO_MIN);
  });

  it('falls back to 16:9 and scale 1 for degenerate geometry', () => {
    const r = measureBurnRatios({ videoWidth: 0, videoHeight: 0, subsScale: 0 });
    assert.deepStrictEqual(r, measureBurnRatios(hd));
    assert.deepStrictEqual(measureBurnRatios(undefined), measureBurnRatios(hd));
  });
});

const { burnWords, fillFullscreenSubtitle } = require('../site/js/burn_video');

describe('burnWords', () => {
  it('splits only where the burner splits: on whitespace', () => {
    // tools/burn_subtitles.py wraps on text.split(); a hyphen, a dash or a
    // slash is no break opportunity there, so it must not be one on screen.
    assert.deepStrictEqual(burnWords('до Нью-Йорка, 1990–1995 і/або'),
      ['до', 'Нью-Йорка,', '1990–1995', 'і/або']);
  });

  it('treats any whitespace run as one gap, as str.split() does', () => {
    assert.deepStrictEqual(burnWords('  а\u00a0не\t\nтак  '), ['а', 'не', 'так']);
  });

  it('gives no words for blank text', () => {
    assert.deepStrictEqual(burnWords('   '), []);
    assert.deepStrictEqual(burnWords(''), []);
  });
});

describe('fillFullscreenSubtitle', () => {
  function fakeDoc() {
    function node(tag) {
      return {
        tagName: tag, className: '', children: [], text: '',
        appendChild(c) { this.children.push(c); return c; },
        set textContent(v) { this.children = []; this.text = v; },
        get textContent() {
          return this.text + this.children.map((c) => c.textContent).join('');
        },
      };
    }
    return {
      createElement: (tag) => node(tag),
      createTextNode: (t) => ({ textContent: t }),
      node,
    };
  }

  it('wraps every word in a no-break box, joined by plain spaces, in one wrapper', () => {
    const doc = fakeDoc();
    const el = doc.node('div');
    el.ownerDocument = doc;
    el.textContent = 'old';
    fillFullscreenSubtitle(el, 'до  Нью-Йорка,');
    assert.strictEqual(el.textContent, 'до Нью-Йорка,');
    // One child: the band is a flex container, and loose words would each be
    // a flex item that never wraps.
    assert.strictEqual(el.children.length, 1);
    assert.strictEqual(el.children[0].className, 'fs-text');
    const words = el.children[0].children.filter((c) => c.tagName === 'span');
    assert.deepStrictEqual(words.map((w) => w.className), ['fs-word', 'fs-word']);
    assert.deepStrictEqual(words.map((w) => w.textContent), ['до', 'Нью-Йорка,']);
  });
});

const {
  BURN_STEP_WEIGHTS,
  BURN_RENDER_BLOCK,
  computeProgress,
  renderEtaSeconds,
  burnPhases,
  burnSegments,
  burnPhaseKey,
  burnPhaseNumber,
} = require('../site/js/burn_video');

// A third arg lets tests express a job that completed WITHOUT success
// (failure/cancelled outside any named step) — see computeProgress's
// job.conclusion check.
function job(steps, status, conclusion) {
  return {
    status: status || 'in_progress',
    conclusion: conclusion || (status === 'completed' ? 'success' : null),
    steps: steps,
  };
}
const T0 = 1700000000000;
const done = (name) => ({ name, status: 'completed', conclusion: 'success' });

describe('BURN_STEP_WEIGHTS', () => {
  it('the step weights sum to exactly one', () => {
    const sum = BURN_STEP_WEIGHTS.reduce((a, s) => a + s.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  });

  it('names match the workflow step names', () => {
    // tests/test_burn_workflow_steps.py guards this against the YAML itself;
    // spelled out here too so a rename shows up in the SPA suite as well.
    assert.deepStrictEqual(BURN_STEP_WEIGHTS.map((s) => s.name), [
      'Install dependencies', 'Download video', 'Start render',
      'Render 5%', 'Render 10%', 'Render 15%', 'Render 20%', 'Render 25%',
      'Render 30%', 'Render 35%', 'Render 40%', 'Render 45%', 'Render 50%',
      'Render 55%', 'Render 60%', 'Render 65%', 'Render 70%', 'Render 75%',
      'Render 80%', 'Render 85%', 'Render 90%', 'Render 95%',
      'Finish render', 'Upload result',
    ]);
  });
});

describe('BURN_RENDER_BLOCK', () => {
  it('agrees with the weight table it summarises', () => {
    // Exported so Task 15 can draw the render segment without re-deriving its
    // bounds — and re-derived here so the two can never disagree.
    const names = BURN_STEP_WEIGHTS.map((s) => s.name);
    const first = names.indexOf(BURN_RENDER_BLOCK.firstStep);
    const last = names.indexOf(BURN_RENDER_BLOCK.lastStep);
    assert.ok(first > -1 && last > first, 'the block must name real steps in order');
    const sum = (from, to) => BURN_STEP_WEIGHTS.slice(from, to)
      .reduce((a, s) => a + s.weight, 0);
    assert.ok(Math.abs(sum(first, last + 1) - BURN_RENDER_BLOCK.weight) < 1e-9);
    assert.ok(Math.abs(sum(0, first) - BURN_RENDER_BLOCK.offset) < 1e-9);
  });

  it('reserves the same 0.70 of the bar the render always had', () => {
    assert.ok(Math.abs(BURN_RENDER_BLOCK.weight - 0.70) < 1e-9);
  });
});

describe('renderEtaSeconds', () => {
  it('extrapolates from the measured rate', () => {
    // A quarter of the render block took 10 minutes -> 30 minutes remain.
    assert.ok(Math.abs(renderEtaSeconds(0.25, 600) - 1800) < 1e-6);
  });

  it('has nothing to say before the first gate', () => {
    assert.equal(renderEtaSeconds(0, 600), null);
    assert.equal(renderEtaSeconds(null, 600), null);
  });

  it('has nothing to say once the block is complete', () => {
    // f >= 1 would extrapolate zero or negative time remaining.
    assert.equal(renderEtaSeconds(1, 600), null);
    assert.equal(renderEtaSeconds(1.5, 600), null);
  });
});

describe('computeProgress', () => {
  it('is zero before anything starts', () => {
    const p = computeProgress(job([]), T0);
    assert.strictEqual(p.fraction, 0);
    assert.strictEqual(p.done, false);
  });

  it('credits completed steps by their weight', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'),
    ]), T0);
    assert.ok(Math.abs(p.fraction - 0.20) < 1e-9);
  });

  it('a completed gate credits its own weight and nothing else', () => {
    const j = {steps: [
      {name: 'Install dependencies', status: 'completed'},
      {name: 'Download video', status: 'completed'},
      {name: 'Start render', status: 'completed'},
      {name: 'Render 10%', status: 'completed'},
      {name: 'Render 20%', status: 'in_progress'}
    ]};
    const p = computeProgress(j, 0);
    assert.ok(Math.abs(p.fraction - (0.05 + 0.15 + 0.05 + 0.0325)) < 1e-9);
    assert.equal(p.estimated, undefined);   // the fraction is a fact now
  });

  it('the render share is the position inside the render block', () => {
    // Start render + one gate done = 0.05 + 0.0325 of the block's 0.70
    const j = {steps: [
      {name: 'Install dependencies', status: 'completed'},
      {name: 'Download video', status: 'completed'},
      {name: 'Start render', status: 'completed', started_at: '2026-07-31T10:00:00Z'},
      {name: 'Render 10%', status: 'completed'},
      {name: 'Render 20%', status: 'in_progress'}
    ]};
    const p = computeProgress(j, Date.parse('2026-07-31T10:10:00Z'));
    assert.ok(Math.abs(p.renderFraction - (0.05 + 0.0325) / 0.70) < 1e-9);
    assert.equal(p.renderStartedMs, Date.parse('2026-07-31T10:00:00Z'));
  });

  it('has no render share before the render block begins', () => {
    const p = computeProgress(job([done('Install dependencies')]), T0);
    assert.strictEqual(p.renderFraction, null);
    assert.strictEqual(p.renderStartedMs, null);
  });

  it('reports the gate it is waiting on as the label', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'), done('Start render'),
      { name: 'Render 10%', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.label, 'Render 10%');
  });

  it('credits every step but still takes done only from the job', () => {
    // Every named step reports completed while job.status is still
    // in_progress — hit on every real run, because actions/cache and
    // actions/setup-python each append a "Post ..." step that runs AFTER
    // "Upload result" but BEFORE the job flips to completed. The bar may sit
    // at 100% there (it is true: the steps ARE done), but `done` — which is
    // what reveals the download button — must come from the job alone.
    const p = computeProgress(job(BURN_STEP_WEIGHTS.map((s) => done(s.name))), T0);
    assert.strictEqual(p.done, false);
    assert.ok(Math.abs(p.fraction - 1) < 1e-9, 'got ' + p.fraction);
  });

  it('reports done only when the job succeeded', () => {
    const p = computeProgress(job([done('Upload result')], 'completed'), T0);
    assert.strictEqual(p.done, true);
    assert.strictEqual(p.fraction, 1);
  });

  it('surfaces which step failed', () => {
    const p = computeProgress(job([
      { name: 'Download video', status: 'completed', conclusion: 'failure' },
    ], 'completed'), T0);
    assert.strictEqual(p.failed, true);
    assert.strictEqual(p.failedStep, 'Download video');
    assert.strictEqual(p.done, false);
  });

  it('surfaces a failed gate by its own name', () => {
    // A stalled or crashed render fails whichever gate was waiting — that name
    // is the most specific thing the user can be told about where it died.
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'), done('Start render'),
      { name: 'Render 40%', status: 'completed', conclusion: 'failure' },
    ], 'completed'), T0);
    assert.strictEqual(p.failedStep, 'Render 40%');
  });

  it('surfaces a failure in a weightless step it can still name', () => {
    // 'Validate inputs' carries no weight, so the weighted loop never sees it.
    // Without this the one step whose job is to report bad input would come back
    // as "failed, somewhere" and the panel could say nothing about where.
    const p = computeProgress(job([
      done('Install dependencies'),
      { name: 'Validate inputs', status: 'completed', conclusion: 'failure' },
    ], 'completed', 'failure'), T0);
    assert.strictEqual(p.failed, true);
    assert.strictEqual(p.failedStep, 'Validate inputs');
    assert.strictEqual(p.done, false);
    // It still earns no weight of its own: the bar stops at Install dependencies.
    assert.ok(Math.abs(p.fraction - 0.05) < 1e-9, 'got ' + p.fraction);
  });

  it('does not invent a weightless failure on a healthy run', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Validate inputs'),
      { name: 'Download video', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.failed, false);
    assert.strictEqual(p.failedStep, '');
  });

  it('tolerates a null job while the run is still being created', () => {
    const p = computeProgress(null, T0);
    assert.strictEqual(p.fraction, 0);
    assert.strictEqual(p.failed, false);
  });

  it('ignores unknown step names instead of throwing', () => {
    const p = computeProgress(job([done('Set up job')]), T0);
    assert.strictEqual(p.fraction, 0);
  });

  it('startedMs is the earliest weighted step start', () => {
    const j = {steps: [
      {name: 'Set up job', status: 'completed', started_at: '2026-07-31T09:59:00Z'},
      {name: 'Install dependencies', status: 'completed', started_at: '2026-07-31T10:00:00Z'},
      {name: 'Download video', status: 'in_progress', started_at: '2026-07-31T10:01:00Z'}
    ]};
    // Only weighted steps count — 'Set up job' is runner overhead, not our work.
    assert.equal(computeProgress(j, 0).startedMs, Date.parse('2026-07-31T10:00:00Z'));
  });

  it('startedMs is null before anything of ours has started', () => {
    assert.equal(computeProgress(null, 0).startedMs, null);
  });

  it('startedMs survives the finished-job early return', () => {
    // The elapsed counter turns into the burn.done_in line on success, so the
    // start instant has to be there on the done path too.
    const p = computeProgress(job([
      {name: 'Install dependencies', status: 'completed',
       started_at: '2026-07-31T10:00:00Z'},
      done('Upload result'),
    ], 'completed'), T0);
    assert.strictEqual(p.done, true);
    assert.equal(p.startedMs, Date.parse('2026-07-31T10:00:00Z'));
  });

  it('does not report done when the job failed outside a named step', () => {
    const p = computeProgress(job([], 'completed', 'failure'), T0);
    assert.strictEqual(p.done, false);
    assert.strictEqual(p.failed, true);
  });

  // Regression: a real run against a workflow whose steps we do not know
  // (the placeholder that lived on main, or any future drift) left the panel
  // confidently naming the LAST COMPLETED step for the whole render. The
  // fraction was right; the phase was a lie. Saying nothing beats saying the
  // wrong thing, so an unrecognised running step must clear the label and
  // announce itself.
  it('reports when the job finished, so "done in N min" cannot keep growing', () => {
    // The elapsed line may tick off the wall clock while the run is live, but
    // a FINISHED run took a fixed amount of time. Measuring it against
    // Date.now() makes the panel say "done in 17 min" for a run that took one,
    // and worse the longer the tab stays open.
    const j = job([done('Install dependencies'), done('Upload result')], 'completed');
    j.steps[0].started_at = '2026-07-31T13:48:23Z';
    j.completed_at = '2026-07-31T13:49:47Z';
    const p = computeProgress(j, Date.parse('2026-07-31T14:06:00Z'));
    assert.strictEqual(p.startedMs, Date.parse('2026-07-31T13:48:23Z'));
    assert.strictEqual(p.finishedMs, Date.parse('2026-07-31T13:49:47Z'));
    assert.ok((p.finishedMs - p.startedMs) / 60000 < 2, 'the run took under two minutes');
  });

  it('has no finish instant while the job is still running', () => {
    const p = computeProgress(job([{ name: 'Download video', status: 'in_progress' }]), T0);
    assert.strictEqual(p.finishedMs, null);
  });

  it('does not name a phase while a step we do not know is running', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'),
      { name: 'Burn subtitles', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.label, '', 'must not carry the last completed step forward');
    assert.strictEqual(p.unknownStep, 'Burn subtitles');
    assert.ok(Math.abs(p.fraction - 0.20) < 1e-9, 'credited weight is still honest');
  });

  it('reports no unknown step on a healthy run', () => {
    const p = computeProgress(job([
      done('Install dependencies'),
      { name: 'Download video', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.label, 'Download video');
    assert.strictEqual(p.unknownStep, '');
  });

  it('ignores the runner steps that bracket every job', () => {
    // 'Set up job' and the trailing 'Post ...' steps are the runner's, not
    // ours — they must never be reported as an unrecognised workflow.
    const p = computeProgress(job([
      { name: 'Set up job', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.unknownStep, '');
  });

  it('ignores our own unnamed steps, which GitHub titles after the command', () => {
    // An unnamed `run:` step shows up as "Run <first line>", and the workflow
    // uses unnamed steps on purpose (the cache, the content-ref guard) so that
    // nothing named sits between the steps the bar is built from. Reporting one
    // as unrecognised would flash "this run is not from this version" over a
    // perfectly healthy render — the poll interval is 5s, the step lasts ~1s,
    // so it lands there sooner or later.
    for (const name of ['Run set -euo pipefail', 'Run actions/checkout@v7']) {
      const p = computeProgress(job([
        done('Install dependencies'), { name: name, status: 'in_progress' },
      ]), T0);
      assert.strictEqual(p.unknownStep, '', name);
    }
  });

  it('still reports a NAMED step it does not know', () => {
    // The diagnostic must survive the rule above: a version skew shows up as a
    // named step (main's stub had one called 'Burn subtitles').
    const p = computeProgress(job([
      done('Install dependencies'), { name: 'Burn subtitles', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.unknownStep, 'Burn subtitles');
  });

  it('does not report done when the job was cancelled outside a named step', () => {
    const p = computeProgress(job([], 'completed', 'cancelled'), T0);
    assert.strictEqual(p.done, false);
    assert.strictEqual(p.failed, true);
  });
});

// The panel draws four phases, not fourteen steps: three short certainties and
// one long stretch. The mapping from a progress fraction to per-segment
// geometry is arithmetic, so it lives here and is tested here — index.html only
// sets classes and widths from it.
describe('burnPhases', () => {
  it('the phases partition the weight table exactly', () => {
    const phases = burnPhases();
    assert.deepEqual(phases.map(p => p.key), ['prepare', 'fetch', 'render', 'upload']);
    const sum = phases.reduce((a, p) => a + p.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `phase weights sum to ${sum}`);
    // Every weighted step belongs to exactly one phase.
    const owned = phases.reduce((a, p) => a + p.stepNames.length, 0);
    assert.equal(owned, BURN_STEP_WEIGHTS.length);
  });

  it('the render phase carries the whole render block', () => {
    const render = burnPhases().find(p => p.key === 'render');
    assert.ok(Math.abs(render.weight - 0.70) < 1e-9);
    assert.equal(render.stepNames.length, 21);          // Start render + 19 gates + Finish render
    assert.ok(Math.abs(render.start - 0.20) < 1e-9);    // prepare 0.05 + fetch 0.15
  });

  it('refuses to guess when the weight table stops grouping into four phases', () => {
    // Four wrong widths drawn confidently would be worse than a loud failure:
    // the whole point of the form is that it says something true.
    const saved = BURN_STEP_WEIGHTS.slice();
    BURN_STEP_WEIGHTS.splice(1, 1);   // drop 'Download video' — no fetch phase left
    try {
      assert.throws(() => burnPhases(), /four phases/);
    } finally {
      BURN_STEP_WEIGHTS.length = 0;
      saved.forEach((s) => BURN_STEP_WEIGHTS.push(s));
    }
    assert.equal(burnPhases().length, 4, 'the table must be restored for later tests');
  });
});

describe('burnSegments', () => {
  it('a phase fills only with its own credited weight', () => {
    // Install + Download done, Start render + one gate done: render is 0.0825/0.70 full.
    const p = {fraction: 0.05 + 0.15 + 0.05 + 0.0325, label: 'Render 20%',
               done: false, failed: false, failedStep: ''};
    const segs = burnSegments(p);
    assert.equal(segs[0].fill, 1);
    assert.equal(segs[1].fill, 1);
    assert.ok(Math.abs(segs[2].fill - 0.0825 / 0.70) < 1e-9);
    assert.equal(segs[3].fill, 0);
  });

  it('the phase containing the running step is the active one', () => {
    const segs = burnSegments({fraction: 0.2, label: 'Render 10%',
                               done: false, failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.state), ['done', 'done', 'active', 'idle']);
  });

  it('a failed step paints its own phase and no other', () => {
    const segs = burnSegments({fraction: 0.2, label: 'Render 10%',
                               done: false, failed: true, failedStep: 'Render 10%'});
    assert.deepEqual(segs.map(s => s.state), ['done', 'done', 'failed', 'idle']);
  });

  it('a failure with no named step marks nothing', () => {
    // We do not know where it died, so we do not claim a location.
    const segs = burnSegments({fraction: 0, label: '', done: false,
                               failed: true, failedStep: ''});
    assert.ok(segs.every(s => s.state !== 'failed'));
  });

  it('a finished run shows every phase complete', () => {
    const segs = burnSegments({fraction: 1, label: '', done: true,
                               failed: false, failedStep: ''});
    assert.ok(segs.every(s => s.fill === 1 && s.state === 'done'));
  });

  it('an unknown label leaves no phase active', () => {
    // "Post Run actions/checkout" and friends are not ours to display.
    const segs = burnSegments({fraction: 1, label: 'Post Run actions/checkout',
                               done: false, failed: false, failedStep: ''});
    assert.ok(segs.every(s => s.state !== 'active'));
  });

  it('breathes the first phase through the run-discovery window', () => {
    // Dispatched, but no step of ours is named yet, and that lasts up to a
    // minute. An inert track reads as broken, so the phase about to run is the
    // active one. This is a model rule, not a driver touch-up: it is derived
    // from the same facts as every other state.
    const segs = burnSegments({fraction: 0, label: '', done: false,
                               failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.state), ['active', 'idle', 'idle', 'idle']);
  });

  it('does not breathe the first phase once any phase has earned something', () => {
    const segs = burnSegments({fraction: 0.05, label: 'Download video',
                               done: false, failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.state), ['done', 'active', 'idle', 'idle']);
  });

  it('does not breathe the first phase on a terminal state', () => {
    const failed = burnSegments({fraction: 0, label: '', done: false,
                                 failed: true, failedStep: ''});
    assert.ok(failed.every(s => s.state === 'idle'),
      'a failure we cannot locate must not breathe an arbitrary phase');
  });

  it('carries the geometry the track needs, in phase order', () => {
    // The driver sets flex-grow from these weights, so a segment that forgot
    // its weight would silently draw four equal widths.
    const segs = burnSegments({fraction: 0, label: '', done: false,
                               failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.key), ['prepare', 'fetch', 'render', 'upload']);
    assert.deepEqual(segs.map(s => s.weight), burnPhases().map(p => p.weight));
    assert.deepEqual(segs.map(s => s.start), burnPhases().map(p => p.start));
  });
});

describe('burnPhaseKey', () => {
  it('names the phase a workflow step belongs to', () => {
    assert.equal(burnPhaseKey('Install dependencies'), 'prepare');
    assert.equal(burnPhaseKey('Download video'), 'fetch');
    assert.equal(burnPhaseKey('Start render'), 'render');
    assert.equal(burnPhaseKey('Render 90%'), 'render');
    assert.equal(burnPhaseKey('Finish render'), 'render');
    assert.equal(burnPhaseKey('Upload result'), 'upload');
  });

  it('is null for steps that are not ours', () => {
    assert.equal(burnPhaseKey('Set up job'), null);
    assert.equal(burnPhaseKey(''), null);
    assert.equal(burnPhaseKey(undefined), null);
  });

  it('names a phase for the weightless steps that are still ours', () => {
    // 'Validate inputs' is the one step whose entire job is to report bad user
    // input — the SPA can send a font_ratio it refuses — so its failure must
    // name a phase instead of falling through to the generic "render failed".
    assert.equal(burnPhaseKey('Validate inputs'), 'prepare');
  });

  it('keeps the weightless steps out of the weight table', () => {
    // Giving 'Validate inputs' weight would change BURN_STEP_WEIGHTS, whose sum,
    // order and name-for-name contract with burn-subtitles.yml are pinned by
    // tests/test_burn_workflow_steps.py and verified against a real run.
    assert.ok(!BURN_STEP_WEIGHTS.some((s) => s.name === 'Validate inputs'),
      'the alias must name a phase without earning any of the bar');
  });
});

describe('burnPhaseNumber', () => {
  it('burnPhaseNumber is the 1-based position of the active phase', () => {
    assert.equal(burnPhaseNumber({label: 'Download video'}), 2);
    assert.equal(burnPhaseNumber({label: 'Render 40%'}), 3);
    assert.equal(burnPhaseNumber({label: 'Upload result'}), 4);
    assert.equal(burnPhaseNumber({label: ''}), null);
  });
});

describe('parseBurnRunTitle against the workflow run-name', () => {
  // The workflow writes the run name and this module reads it back, in two
  // languages. The contract is checked from the YAML itself rather than from a
  // copy of it, so a segment added, dropped or reordered there fails here.
  const fs = require('fs');
  const { parseBurnRunTitle } = require('../site/js/burn_video');
  const yaml = fs.readFileSync('.github/workflows/burn-subtitles.yml', 'utf8');
  const block = yaml.match(/^run-name: >-\n((?: {2}.*\n)+)/m);

  // A folded scalar joins its lines with single spaces; each ${{ }} is replaced
  // with the value the runner would put there.
  function render(values) {
    assert.ok(block, 'run-name is no longer a folded block in burn-subtitles.yml');
    const template = block[1].split('\n').map((line) => line.trim()).filter(Boolean).join(' ');
    return template.replace(/\$\{\{ (.+?) \}\}/g, (whole, expr) => {
      assert.ok(expr in values, 'run-name uses an expression this test does not know: ' + expr);
      return values[expr];
    });
  }

  const LABEL = "inputs.run_label || format('{0}/{1}', inputs.talk_id, inputs.video_slug)";

  it('reads back every field the workflow writes, a separator inside the label included', () => {
    const title = render({
      [LABEL]: 'Puja · Part 2 — Talk',
      'inputs.talk_id': '1993-09-19_Ganesha-Puja-Cabella',
      'inputs.video_slug': 'Talk',
      'github.actor': 'SlavaSubotskiy',
      "inputs.subs_scale || '100'": '150',
      "inputs.clip || 'full'": '600000-930500',
      'inputs.request_id': 'req-mtrnhgm2-158i'
    });
    assert.deepStrictEqual(parseBurnRunTitle(title), {
      label: 'Puja · Part 2 — Talk',
      talkId: '1993-09-19_Ganesha-Puja-Cabella',
      videoSlug: 'Talk',
      actor: 'SlavaSubotskiy',
      scalePct: 150,
      clip: { startMs: 600000, endMs: 930500 },
      requestId: 'req-mtrnhgm2-158i'
    });
  });

  it('reads a whole-video run exactly as the input defaults write it', () => {
    const title = render({
      [LABEL]: 'Ganesha Puja — Talk',
      'inputs.talk_id': '1993-09-19_Ganesha-Puja-Cabella',
      'inputs.video_slug': 'Talk',
      'github.actor': 'reviewer-2',
      "inputs.subs_scale || '100'": '100',
      "inputs.clip || 'full'": 'full',
      'inputs.request_id': 'req-a-1'
    });
    const parsed = parseBurnRunTitle(title);
    assert.ok(parsed, 'a run dispatched with the defaults must parse: ' + title);
    assert.strictEqual(parsed.clip, null);
    assert.strictEqual(parsed.scalePct, 100);
  });
});

describe('buildBurnInputs clip digits', () => {
  // Nine digits of milliseconds — about 277 hours — is where both the workflow's
  // clip grammar and parseBurnRunTitle stop. A longer span would be dispatched
  // and then refused, or rendered and never listed.
  const { buildBurnInputs: build } = require('../site/js/burn_video');
  const RATIOS = { font_ratio: 0.07, padtop_ratio: 0.07, padbot_ratio: 0.03 };
  const opts = (clip) => ({ sourceRef: 'main', subsScale: 1, clip: clip });

  it('accepts an end of nine digits', () => {
    assert.strictEqual(build('t', 'v', RATIOS, 'req-a-1', opts({ startMs: 0, endMs: 999999999 })).clip,
      '0-999999999');
  });

  it('refuses an end of ten', () => {
    assert.throws(() => build('t', 'v', RATIOS, 'req-a-1', opts({ startMs: 0, endMs: 1000000000 })),
      /invalid clip/);
  });
});
