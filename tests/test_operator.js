const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isOperator, operatorStageOf, OPERATOR_FILTERS, matchesOperatorFilter,
  countOperatorStages, gmailLinkFromComments, packageFiles,
  pipelineDone, talkPhase, operatorStep, maySpendLlm, restoreWaiting, takeQaOffered,
  backToQaOffered,
} = require('../site/js/operator');

const ROLES = { operators: [{ login: 'SlavaSubotskiy', id: 11644864 }] };
const TALK = '1987-04-19_Easter-Puja-Materialism';
const GMAIL = 'https://mail.google.com/mail/?view=cm&fs=1&to=help%40amruta.org&su=Transcript';
const BOT = { login: 'github-actions[bot]' };
const readyBody = (url) => '### Ready for Amruta\n\n**[Open the e-mail in Gmail](' + url + ')**\n\nFiles:\n- [a](https://x)\n';

describe('isOperator', () => {
  it('matches the numeric id from roles.yaml', () => {
    assert.strictEqual(isOperator(ROLES, 11644864), true);
    assert.strictEqual(isOperator(ROLES, 42), false);
  });
  it('never matches by login or by an id given as a string', () => {
    assert.strictEqual(isOperator(ROLES, 'SlavaSubotskiy'), false);
    assert.strictEqual(isOperator(ROLES, '11644864'), false);
  });
  it('treats a missing or malformed roles file as no operators', () => {
    assert.strictEqual(isOperator(null, 11644864), false);
    assert.strictEqual(isOperator({ operators: 'x' }, 11644864), false);
    assert.strictEqual(isOperator({ operators: [null, { id: '11644864' }] }, 11644864), false);
    assert.strictEqual(isOperator(ROLES, undefined), false);
  });
});

describe('operatorStageOf', () => {
  it('reads the stage written by sync-review-status.py', () => {
    ['pipeline', 'translator', 'review', 'qa', 'ready', 'delivered'].forEach((s) =>
      assert.strictEqual(operatorStageOf({ operator_stage: s }), s));
  });
  it('is null for no entry, no stage or an unknown stage', () => {
    assert.strictEqual(operatorStageOf(null), null);
    assert.strictEqual(operatorStageOf({ status: 'approved' }), null);
    assert.strictEqual(operatorStageOf({ operator_stage: 'operator' }), null);
  });
});

describe('operator filters', () => {
  it('lists the chips in order', () => {
    assert.deepStrictEqual(OPERATOR_FILTERS, ['op-all', 'op-new', 'op-pipeline', 'op-translator',
      'op-review', 'op-qa', 'op-ready', 'op-delivered']);
  });
  it('"all" is the operator\'s own work: not the translator\'s, not what was sent', () => {
    ['new', 'pipeline', 'review', 'qa', 'ready'].forEach((s) =>
      assert.strictEqual(matchesOperatorFilter(s, 'op-all'), true, s));
    ['translator', 'delivered', null].forEach((s) =>
      assert.strictEqual(matchesOperatorFilter(s, 'op-all'), false, String(s)));
  });
  it('each step chip matches only its step', () => {
    assert.strictEqual(matchesOperatorFilter('new', 'op-new'), true);
    assert.strictEqual(matchesOperatorFilter('pipeline', 'op-new'), false);
    assert.strictEqual(matchesOperatorFilter('translator', 'op-translator'), true);
    assert.strictEqual(matchesOperatorFilter(null, 'op-review'), false);
  });
  it('counts steps', () => {
    assert.deepStrictEqual(countOperatorStages(['new', 'pipeline', 'translator', 'translator', 'qa', 'ready', 'delivered', null, 'review']),
      { all: 5, new: 1, pipeline: 1, translator: 2, review: 1, qa: 1, ready: 1, delivered: 1 });
  });
});

const NONE = { translated: false, reviewed: false, srt: false, nVideos: 1, nWhisper: 0, nSrt: 0 };
const PART = { translated: true, reviewed: false, srt: false, nVideos: 1, nWhisper: 1, nSrt: 0 };
const DONE = { translated: true, reviewed: true, srt: true, nVideos: 2, nWhisper: 2, nSrt: 2 };
const TEXT_ONLY = { translated: true, reviewed: true, srt: false, textOnly: true, nVideos: 0, nWhisper: 0, nSrt: 0 };
// Not hydrated yet: no counted video, but not known to be text-only either.
const UNKNOWN = { translated: true, reviewed: true, srt: false, textOnly: false, nVideos: 0, nWhisper: 0, nSrt: 0 };

describe('pipelineDone', () => {
  it('is done when the Ukrainian transcript and every video\'s subtitles exist', () => {
    assert.strictEqual(pipelineDone(DONE), true);
    assert.strictEqual(pipelineDone(PART), false);
    assert.strictEqual(pipelineDone(NONE), false);
  });
  it('a talk without video is done with its transcript', () => {
    assert.strictEqual(pipelineDone(TEXT_ONLY), true);
  });
  it('a talk whose meta.yaml has not loaded is not done', () => {
    assert.strictEqual(pipelineDone(UNKNOWN), false);
  });
});

describe('talkPhase — the expert chips', () => {
  const st = (o) => Object.assign({ status: 'pending', issue_number: 9 }, o);
  it('sent once delivered', () => {
    assert.strictEqual(talkPhase(st({ status: 'approved', operator_stage: 'delivered' }), DONE), 'sent');
  });
  it('a claimed review stays in review whatever the operator stage', () => {
    assert.strictEqual(talkPhase(st({ status: 'in-progress', operator_stage: 'pipeline' }), PART), 'in-review');
  });
  it('handed back by the translator is in progress', () => {
    ['review', 'qa', 'ready'].forEach((s) =>
      assert.strictEqual(talkPhase(st({ status: 'approved', operator_stage: s }), DONE), 'operator', s));
    assert.strictEqual(talkPhase(st({ status: 'approved' }), DONE), 'operator');
  });
  it('a pipeline not finished is in progress', () => {
    assert.strictEqual(talkPhase(null, NONE), 'operator');
    assert.strictEqual(talkPhase(st({ operator_stage: 'pipeline', issue_number: null }), PART), 'operator');
  });
  it('built with a review issue needs review', () => {
    assert.strictEqual(talkPhase(st({ operator_stage: 'translator' }), DONE), 'needs-review');
    assert.strictEqual(talkPhase(st({}), DONE), 'needs-review');
  });
  it('built without a review issue is in progress', () => {
    assert.strictEqual(talkPhase(st({ issue_number: null }), DONE), 'operator');
  });
});

describe('operatorStep — the operator chips', () => {
  const st = (o) => Object.assign({ status: 'pending', issue_number: 9 }, o);
  it('labels past the translator win', () => {
    ['review', 'qa', 'ready', 'delivered'].forEach((s) =>
      assert.strictEqual(operatorStep(st({ status: 'approved', operator_stage: s }), DONE), s));
  });
  it('new without any artifact, pipeline with some', () => {
    assert.strictEqual(operatorStep(null, NONE), 'new');
    assert.strictEqual(operatorStep(st({ operator_stage: 'pipeline', issue_number: null }), NONE), 'new');
    assert.strictEqual(operatorStep(null, PART), 'pipeline');
  });
  it('built with a review issue, or claimed, is the translator\'s', () => {
    assert.strictEqual(operatorStep(st({}), DONE), 'translator');
    assert.strictEqual(operatorStep(st({ status: 'in-progress' }), PART), 'translator');
  });
  it('built but no review issue yet is still the pipeline', () => {
    assert.strictEqual(operatorStep(st({ issue_number: null }), DONE), 'pipeline');
  });
  it('approved with no operator stage has no step', () => {
    assert.strictEqual(operatorStep(st({ status: 'approved' }), DONE), null);
  });
});

describe('gmailLinkFromComments', () => {
  it('takes the Gmail link from the bot\'s Ready comment', () => {
    assert.strictEqual(gmailLinkFromComments([{ user: BOT, body: readyBody(GMAIL) }]), GMAIL);
  });
  it('ignores the same comment written by anyone else', () => {
    assert.strictEqual(gmailLinkFromComments([{ user: { login: 'IrynaFilSY' }, body: readyBody(GMAIL) }]), null);
  });
  it('ignores bot comments without the Ready heading', () => {
    assert.strictEqual(gmailLinkFromComments([{ user: BOT, body: '[x](' + GMAIL + ')' }]), null);
  });
  it('accepts only https://mail.google.com/mail/? links', () => {
    assert.strictEqual(gmailLinkFromComments([{ user: BOT, body: readyBody('javascript:alert(1)') }]), null);
    assert.strictEqual(gmailLinkFromComments([{ user: BOT, body: readyBody('https://mail.google.com.evil.io/mail/?x') }]), null);
  });
  it('prefers the newest Ready comment (a re-run replaces the package)', () => {
    const newer = GMAIL + '&v=2';
    assert.strictEqual(gmailLinkFromComments([
      { user: BOT, body: readyBody(GMAIL) }, { user: BOT, body: readyBody(newer) },
    ]), newer);
  });
  it('is null for no comments', () => {
    assert.strictEqual(gmailLinkFromComments([]), null);
    assert.strictEqual(gmailLinkFromComments(null), null);
  });
});

describe('packageFiles', () => {
  it('lists the talk\'s _for_Amruta files, sorted, without nested paths or other talks', () => {
    const tree = [
      { path: 'talks/' + TALK + '/_for_Amruta/transcript_uk.txt' },
      { path: 'talks/' + TALK + '/_for_Amruta/Easter-Puja_uk.srt' },
      { path: 'talks/' + TALK + '/_for_Amruta/old/x.srt' },
      { path: 'talks/' + TALK + '/_for_Amruta' },
      { path: 'talks/OTHER/_for_Amruta/transcript_uk.txt' },
      { path: 'talks/' + TALK + '/transcript_uk.txt' },
    ];
    assert.deepStrictEqual(packageFiles(tree, TALK), ['Easter-Puja_uk.srt', 'transcript_uk.txt']);
  });
});

describe('maySpendLlm', () => {
  it('needs an operator flagged llm: true, matched by numeric id', () => {
    const roles = { operators: [{ id: 1, llm: true }, { id: 2 }, { id: 3, llm: 'yes' }] };
    assert.strictEqual(maySpendLlm(roles, 1), true);
    assert.strictEqual(maySpendLlm(roles, 2), false);
    assert.strictEqual(maySpendLlm(roles, 3), false);
    assert.strictEqual(maySpendLlm(roles, '1'), false);
    assert.strictEqual(maySpendLlm(null, 1), false);
  });
});

describe('takeQaOffered', () => {
  it('offers the take on a translator card that has its Operator issue', () => {
    assert.strictEqual(takeQaOffered('translator', { operator_stage: 'translator', operator_issue: 5 }), true);
  });
  it('does not offer it without an Operator issue (before the backfill)', () => {
    assert.strictEqual(takeQaOffered('translator', { status: 'pending' }), false);
    assert.strictEqual(takeQaOffered('translator', null), false);
  });
  it('does not offer it at any other stage', () => {
    assert.strictEqual(takeQaOffered('translator', { operator_stage: 'review', operator_issue: 5 }), false);
    assert.strictEqual(takeQaOffered('qa', { operator_stage: 'qa', operator_issue: 5 }), false);
  });
});

describe('backToQaOffered', () => {
  it('offers it on a sent card and on a packaged one, with their Operator issue', () => {
    assert.strictEqual(backToQaOffered('delivered', { operator_stage: 'delivered', operator_issue: 5 }), true);
    assert.strictEqual(backToQaOffered('ready', { operator_stage: 'ready', operator_issue: 5 }), true);
  });
  it('does not offer it without an Operator issue', () => {
    assert.strictEqual(backToQaOffered('delivered', { operator_stage: 'delivered' }), false);
    assert.strictEqual(backToQaOffered('delivered', null), false);
  });
  it('does not offer it at any other stage', () => {
    ['pipeline', 'translator', 'review', 'qa'].forEach((s) => {
      assert.strictEqual(backToQaOffered(s, { operator_stage: s, operator_issue: 5 }), false, s);
    });
  });
});

describe('restoreWaiting', () => {
  const MAX = 15 * 60 * 1000;
  const NOW = 1_800_000_000_000;
  it('keeps a wait that is still within the bot window', () => {
    const stored = { [TALK]: { stage: 'qa', since: NOW - 60_000, issue: 1278 } };
    assert.deepStrictEqual(restoreWaiting(stored, NOW, MAX), stored);
  });
  it('keeps a wait for a take from the translator', () => {
    const stored = { [TALK]: { stage: 'translator', since: NOW - 60_000, issue: 1301 } };
    assert.deepStrictEqual(restoreWaiting(stored, NOW, MAX), stored);
  });
  it('keeps a wait for a sent talk going back to QA', () => {
    const stored = { [TALK]: { stage: 'delivered', since: NOW - 60_000, issue: 1279 } };
    assert.deepStrictEqual(restoreWaiting(stored, NOW, MAX), stored);
  });
  it('drops a wait older than the window, as the live poll would', () => {
    const stored = { [TALK]: { stage: 'qa', since: NOW - MAX - 1, issue: 1278 } };
    assert.deepStrictEqual(restoreWaiting(stored, NOW, MAX), {});
  });
  it('drops malformed entries and survives a missing or corrupt store', () => {
    const stored = {
      a: { stage: 'qa', since: 'yesterday', issue: 1 },
      b: { stage: 'nope', since: NOW, issue: 2 },
      c: { stage: 'ready', since: NOW, issue: '3' },
      d: null,
    };
    assert.deepStrictEqual(restoreWaiting(stored, NOW, MAX), {});
    assert.deepStrictEqual(restoreWaiting(null, NOW, MAX), {});
    assert.deepStrictEqual(restoreWaiting([1, 2], NOW, MAX), {});
  });
  it('drops a wait stamped in the future (a clock moved back cannot pin it forever)', () => {
    const stored = { [TALK]: { stage: 'ready', since: NOW + 60_000, issue: 1300 } };
    assert.deepStrictEqual(restoreWaiting(stored, NOW, MAX), {});
  });
});
