const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isOperator, operatorStageOf, OPERATOR_FILTERS, matchesOperatorFilter,
  countOperatorStages, gmailLinkFromComments, packageFiles,
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
    ['review', 'qa', 'ready', 'delivered'].forEach((s) =>
      assert.strictEqual(operatorStageOf({ operator_stage: s }), s));
  });
  it('is null for no entry, no stage or an unknown stage', () => {
    assert.strictEqual(operatorStageOf(null), null);
    assert.strictEqual(operatorStageOf({ status: 'approved' }), null);
    assert.strictEqual(operatorStageOf({ operator_stage: 'operator' }), null);
  });
});

describe('operator filters', () => {
  it('lists the five chips in order', () => {
    assert.deepStrictEqual(OPERATOR_FILTERS, ['op-all', 'op-review', 'op-qa', 'op-ready', 'op-delivered']);
  });
  it('"all" is the open work: review, qa and ready', () => {
    assert.strictEqual(matchesOperatorFilter('review', 'op-all'), true);
    assert.strictEqual(matchesOperatorFilter('qa', 'op-all'), true);
    assert.strictEqual(matchesOperatorFilter('ready', 'op-all'), true);
    assert.strictEqual(matchesOperatorFilter('delivered', 'op-all'), false);
    assert.strictEqual(matchesOperatorFilter(null, 'op-all'), false);
  });
  it('each stage chip matches only its stage', () => {
    assert.strictEqual(matchesOperatorFilter('qa', 'op-qa'), true);
    assert.strictEqual(matchesOperatorFilter('ready', 'op-qa'), false);
    assert.strictEqual(matchesOperatorFilter('delivered', 'op-delivered'), true);
    assert.strictEqual(matchesOperatorFilter(null, 'op-review'), false);
  });
  it('counts stages', () => {
    assert.deepStrictEqual(countOperatorStages(['qa', 'qa', 'ready', 'delivered', null, 'review']),
      { all: 4, review: 1, qa: 2, ready: 1, delivered: 1 });
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
